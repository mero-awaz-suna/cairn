const RAW_API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000"
).replace(/\/$/, "");
const BROWSER_PROXY_PREFIX = "/api";

function isLoopbackHost(hostname: string) {
  return hostname === "127.0.0.1" || hostname === "localhost";
}

export function getApiBaseUrl() {
  if (typeof window === "undefined") {
    return RAW_API_BASE;
  }

  try {
    const parsed = new URL(RAW_API_BASE);
    if (!isLoopbackHost(parsed.hostname) || isLoopbackHost(window.location.hostname)) {
      return RAW_API_BASE;
    }

    parsed.hostname = window.location.hostname;
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return RAW_API_BASE;
  }
}

export function buildApiUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (typeof window !== "undefined") {
    return `${BROWSER_PROXY_PREFIX}${normalizedPath}`;
  }

  return `${getApiBaseUrl()}${normalizedPath}`;
}