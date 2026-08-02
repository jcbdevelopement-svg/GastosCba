create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  category text not null default 'Otros',
  amount numeric(14,2) not null check (amount > 0),
  description text,
  expense_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists expenses_user_expense_date_idx
  on public.expenses(user_id, expense_date desc);

alter table public.expenses enable row level security;
grant select, insert, update, delete on public.expenses to authenticated;
revoke all on public.expenses from anon;

drop policy if exists "Users can view own expenses" on public.expenses;
create policy "Users can view own expenses"
  on public.expenses for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own expenses" on public.expenses;
create policy "Users can insert own expenses"
  on public.expenses for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own expenses" on public.expenses;
create policy "Users can update own expenses"
  on public.expenses for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own expenses" on public.expenses;
create policy "Users can delete own expenses"
  on public.expenses for delete to authenticated
  using ((select auth.uid()) = user_id);
