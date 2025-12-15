import { ZodError } from 'zod';

export function TitleCase(str: string) {
  return str
    .toLowerCase() // Optional: Normalizes input (e.g., "hELLo" -> "hello")
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function FormatErrors(error: ZodError) {
  return JSON.stringify(error.issues);
}
