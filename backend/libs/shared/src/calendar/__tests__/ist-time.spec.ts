import { hhmmToMinutes, toIst } from '../ist-time';

describe('IST time helpers', () => {
  it('converts UTC instants to IST parts', () => {
    // 2026-07-31T03:45:00Z == 09:15 IST same day (Friday)
    const parts = toIst(new Date('2026-07-31T03:45:00Z'));
    expect(parts.dateKey).toBe('2026-07-31');
    expect(parts.minutesOfDay).toBe(9 * 60 + 15);
    expect(parts.dayOfWeek).toBe(5);
  });

  it('rolls the date across midnight IST', () => {
    // 2026-07-31T19:00:00Z == 00:30 IST on 2026-08-01
    const parts = toIst(new Date('2026-07-31T19:00:00Z'));
    expect(parts.dateKey).toBe('2026-08-01');
    expect(parts.minutesOfDay).toBe(30);
  });

  it('parses HH:mm', () => {
    expect(hhmmToMinutes('15:30')).toBe(930);
    expect(hhmmToMinutes('09:15')).toBe(555);
  });
});
