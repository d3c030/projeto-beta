// Booking configuration for the public-facing area.
// Working hours: Tue–Sat 09:00–19:00, slots every 30 minutes.
// Sunday and Monday closed.

export const BOOKING_PHONE = "5511964040524"; // wa.me format (no +, no spaces)
export const INSTAGRAM_URL = "https://www.instagram.com/studiotaianeoliveira/";

export const SLOT_MINUTES = 30;
export const OPEN_HOUR = 9;
export const CLOSE_HOUR = 19; // last slot starts at 18:30

// 0 = Sun, 1 = Mon, ... 6 = Sat
export const CLOSED_WEEKDAYS: number[] = [0, 1];

export function generateDailySlots(): string[] {
  const slots: string[] = [];
  for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_MINUTES) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}

// Parse "YYYY-MM-DD" as a local date (no TZ shift).
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isoFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isClosedDay(d: Date): boolean {
  return CLOSED_WEEKDAYS.includes(d.getDay());
}

// Normalize a stored time string ("09:00:00" or "09:00") to "HH:MM".
export function normalizeTime(t: string | null | undefined): string | null {
  if (!t) return null;
  const m = t.match(/^(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : null;
}
