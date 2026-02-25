import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** URL base do backend. Sempre retorna URL absoluta (com https:// se necessário). */
export function getBackendUrl(): string {
  const raw = (import.meta.env.VITE_BACKEND_URL ?? "").trim();
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw.replace(/\/+$/, "");
  }
  if (raw && typeof window !== "undefined") {
    return `https://${raw.replace(/\/+$/, "")}`;
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return raw ? `https://${raw.replace(/\/+$/, "")}` : "";
}
