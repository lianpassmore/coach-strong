/**
 * Computes the participant's current program week from their start date.
 *
 * Week 0 = program not yet started (start date is in the future or unknown).
 * Week 1 = days 0–6, Week 2 = days 7–13, … Week 8 = days 49+.
 */
export function computeCurrentWeek(programStartDate: string | null | undefined): number {
  if (!programStartDate) return 0;
  const start = new Date(programStartDate);
  const today = new Date();
  // Work in UTC-neutral whole days
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysSinceStart = Math.floor((today.getTime() - start.getTime()) / msPerDay);
  if (daysSinceStart < 0) return 0; // start date is in the future
  return Math.min(8, Math.floor(daysSinceStart / 7) + 1);
}
