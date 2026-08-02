/** IST helpers — the platform's business clock is Asia/Kolkata (UTC+05:30, no DST). */
const IST_OFFSET_MINUTES = 330;

export interface IstParts {
  dateKey: string; // YYYY-MM-DD
  minutesOfDay: number; // 0..1439
  dayOfWeek: number; // 0=Sun .. 6=Sat
}

export function toIst(now: Date): IstParts {
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  const ist = new Date(utcMs + IST_OFFSET_MINUTES * 60_000);
  const y = ist.getFullYear();
  const m = (ist.getMonth() + 1).toString().padStart(2, '0');
  const d = ist.getDate().toString().padStart(2, '0');
  return {
    dateKey: `${y}-${m}-${d}`,
    minutesOfDay: ist.getHours() * 60 + ist.getMinutes(),
    dayOfWeek: ist.getDay(),
  };
}

export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
