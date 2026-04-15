-- Add missing unique constraint on weekly_content that was skipped because
-- the table already existed when the original migration ran.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'weekly_content_cohort_week_unique'
  ) then
    alter table weekly_content
      add constraint weekly_content_cohort_week_unique
      unique (cohort_id, week_number);
  end if;
end $$;
