import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function capFirst(text: string) {
  const trimmedText = text.trim();
  const outcome = trimmedText.charAt(0).toUpperCase() + trimmedText.slice(1);
  return outcome as string;
}

export function formatDate(
  input: string | Date | undefined | null,
  options: { short?: boolean; includeTime?: boolean } = {}
): string {
  if (!input) return '';
  try {
    const d = typeof input === 'string' ? new Date(input) : input;
    if (isNaN(d.getTime())) return String(input);

    const day = d.getDate();
    const year = d.getFullYear();

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[d.getMonth()];

    let dateStr = '';

    if (options.short) {
      // Short format: "15 Jun 2026"
      dateStr = `${day} ${month} ${year}`;
    } else {
      // Long format: "Monday, 15 Jun 2026"
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[d.getDay()];
      dateStr = `${dayName}, ${day} ${month} ${year}`;
    }

    if (options.includeTime) {
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      dateStr += ` at ${hours}:${minutes}`;
    }

    return dateStr;
  } catch {
    return String(input);
  }
}
