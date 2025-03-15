import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPublicKey(key: string, chars = 4): string {
  if (!key || key.length <= chars * 2) return key
  return `${key.slice(0, chars)}...${key.slice(-chars)}`
}

