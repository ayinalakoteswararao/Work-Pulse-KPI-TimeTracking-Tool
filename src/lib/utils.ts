import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getTargetNumber(target: string | number | null | undefined): number {
  if (target === null || target === undefined) return 0;
  if (typeof target === 'number') return target;
  
  const str = String(target).trim();
  if (!str) return 0;
  
  // If it's a range like "150-200", extract the maximum/last part
  const parts = str.split('-');
  const lastPart = parts[parts.length - 1].trim();
  const num = Number(lastPart);
  
  return isNaN(num) ? 0 : num;
}
