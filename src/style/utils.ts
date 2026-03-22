import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function md(classes: string) {
  const elements = classes.split(" ");
  return elements.map((el) => `md:${el}`).join(" ");
}
