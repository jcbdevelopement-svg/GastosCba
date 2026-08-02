create policy "Users insert own monthly archives"
on public.monthly_archives for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users update own monthly archives"
on public.monthly_archives for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update on public.monthly_archives to authenticated;
