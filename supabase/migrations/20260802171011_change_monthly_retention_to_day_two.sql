do $$
declare v_job bigint;
begin
  select jobid into v_job from cron.job where jobname = 'monthly-financial-retention';
  if v_job is not null then perform cron.unschedule(v_job); end if;
  perform cron.schedule(
    'monthly-financial-retention',
    '0 6 2 * *',
    'select private.cleanup_expired_months()'
  );
end $$;
