create table if not exists public.incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  concept text not null check (length(trim(concept)) > 0),
  amount numeric(14, 2) not null check (amount > 0),
  source text not null default 'Transferencia',
  received_at date not null default (timezone('America/Argentina/Buenos_Aires', now()))::date,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists incomes_user_received_at_idx
  on public.incomes (user_id, received_at desc);

alter table public.incomes enable row level security;

grant select, insert, update, delete on table public.incomes to authenticated;
revoke all on table public.incomes from anon;

drop policy if exists "Users can read their own incomes" on public.incomes;
create policy "Users can read their own incomes"
  on public.incomes for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own incomes" on public.incomes;
create policy "Users can insert their own incomes"
  on public.incomes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own incomes" on public.incomes;
create policy "Users can update their own incomes"
  on public.incomes for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own incomes" on public.incomes;
create policy "Users can delete their own incomes"
  on public.incomes for delete
  to authenticated
  using ((select auth.uid()) = user_id);
