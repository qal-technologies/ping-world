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
