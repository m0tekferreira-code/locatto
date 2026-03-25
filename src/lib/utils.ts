import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parses a date-only string "YYYY-MM-DD" as local midnight (Brazil UTC-3).
 * Using new Date("YYYY-MM-DD") treats the value as UTC midnight, causing a
 * 1-day shift when displayed in timezones behind UTC.
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}
