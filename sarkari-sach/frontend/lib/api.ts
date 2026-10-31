const rawBase =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    : process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const API_BASE_URL = rawBase.replace(/\/+$/, "");

export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}
