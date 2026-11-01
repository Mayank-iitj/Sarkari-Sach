// Safe API URL resolution:
// 1. Explicit env variable (NEXT_PUBLIC_API_URL)
// 2. Client browser in production (non-localhost) -> https://sarkari-sach.onrender.com
// 3. Node environment production -> https://sarkari-sach.onrender.com
// 4. Local fallback -> http://localhost:8000
const getBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1" && host !== "0.0.0.0") {
      return "https://sarkari-sach.onrender.com";
    }
    return `http://${host}:8000`;
  }
  if (process.env.NODE_ENV === "production") {
    return "https://sarkari-sach.onrender.com";
  }
  return "http://localhost:8000";
};

const rawBase = getBaseUrl();
export const API_BASE_URL = rawBase.replace(/\/+$/, "");

export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  // If the path is already a full URL, return it
  if (cleanPath.startsWith("http://") || cleanPath.startsWith("https://")) {
    return cleanPath;
  }
  return `${API_BASE_URL}${cleanPath}`;
}
