create extension if not exists pg_cron with schema pg_catalog;

create schema if not exists private;

create table if not exists public.monthly_archives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_month date not null,
  deletion_reason text not null check (deletion_reason in ('exported', 'automatic')),
  exported_at timestamptz,
  deleted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint monthly_archives_first_day check (period_month = date_trunc('month', period_month)::date),
  constraint monthly_archives_user_month_key unique (user_id, period_month)
);

alter table public.monthly_archives enable row level security;

create policy "Users read own monthly archives"
on public.monthly_archives for select to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.export_and_delete_month(p_month date)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_month date := date_trunc('month', p_month)::date;
  v_next date := (date_trunc('month', p_month) + interval '1 month')::date;
  v_current date := date_trunc('month', timezone('America/Argentina/Buenos_Aires', now()))::date;
  v_start timestamptz := v_month::timestamp at time zone 'America/Argentina/Buenos_Aires';
  v_end timestamptz := v_next::timestamp at time zone 'America/Argentina/Buenos_Aires';
  v_sales integer := 0;
  v_expenses integer := 0;
  v_payments integer := 0;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_month <> v_month or v_month >= v_current then
    raise exception 'Only a completed calendar month can be archived';
  end if;

  delete from public.sales
  where user_id = v_user and sold_at >= v_start and sold_at < v_end;
  get diagnostics v_sales = row_count;

  delete from public.expenses
  where user_id = v_user and expense_date >= v_month and expense_date < v_next;
  get diagnostics v_expenses = row_count;

  delete from public.payments
  where user_id = v_user and payment_date >= v_month and payment_date < v_next;
  get diagnostics v_payments = row_count;

  insert into public.monthly_archives (user_id, period_month, deletion_reason, exported_at, deleted_at)
  values (v_user, v_month, 'exported', now(), now())
  on conflict (user_id, period_month) do update set
    deletion_reason = 'exported', exported_at = now(), deleted_at = now();

  return jsonb_build_object('sales', v_sales, 'expenses', v_expenses, 'payments', v_payments);
end;
$$;

grant execute on function public.export_and_delete_month(date) to authenticated;
revoke execute on function public.export_and_delete_month(date) from public, anon;

create or replace function private.cleanup_expired_months()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_month date := (date_trunc('month', timezone('America/Argentina/Buenos_Aires', now())) - interval '1 month')::date;
  v_next date := (v_month + interval '1 month')::date;
  v_start timestamptz := v_month::timestamp at time zone 'America/Argentina/Buenos_Aires';
  v_end timestamptz := v_next::timestamp at time zone 'America/Argentina/Buenos_Aires';
begin
  insert into public.monthly_archives (user_id, period_month, deletion_reason, deleted_at)
  select distinct source.user_id, v_month, 'automatic', now()
  from (
    select user_id from public.sales where sold_at >= v_start and sold_at < v_end
    union select user_id from public.expenses where expense_date >= v_month and expense_date < v_next
    union select user_id from public.payments where payment_date >= v_month and payment_date < v_next
  ) source
  on conflict (user_id, period_month) do nothing;

  delete from public.sales where sold_at >= v_start and sold_at < v_end;
  delete from public.expenses where expense_date >= v_month and expense_date < v_next;
  delete from public.payments where payment_date >= v_month and payment_date < v_next;
end;
$$;

revoke all on function private.cleanup_expired_months() from public, anon, authenticated;

do $$
declare v_job bigint;
begin
  select jobid into v_job from cron.job where jobname = 'monthly-financial-retention';
  if v_job is not null then perform cron.unschedule(v_job); end if;
  perform cron.schedule(
    'monthly-financial-retention',
    '0 6 5 * *',
    'select private.cleanup_expired_months()'
  );
end $$;
