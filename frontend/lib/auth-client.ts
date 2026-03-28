const TOKEN_STORAGE_KEY = "cairn.jwt";
const REFRESH_STORAGE_KEY = "cairn.refresh";
const USER_STORAGE_KEY = "cairn.user";
const AUTH_COOKIE_KEY = "cairn_jwt";
const TOKEN_COOKIE_CANDIDATES = [
  AUTH_COOKIE_KEY,
  "cairn.jwt",
  "access_token",
  "accessToken",
  "token",
  "jwt",
];
const GOOGLE_LOGIN_START_URL = "http://127.0.0.1:8000/auth/google/start";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000"
).replace(/\/$/, "");

type AuthPayload = {
  email: string;
  password: string;
};

type AuthResponse = {
  token?: string;
  jwt?: string;
  accessToken?: string;
  access_token?: string;
  user?: unknown;
  message?: string;
};

function getAuthEndpoint(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  if (!API_BASE_URL) {
    return path;
  }

  return `${API_BASE_URL}${path}`;
}

function extractToken(response: AuthResponse): string | null {
  return (
    response.token ??
    response.jwt ??
    response.accessToken ??
    response.access_token ??
    null
  );
}

async function parseError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { message?: string; error?: string };
    if (data.message) {
      return data.message;
    }

    if (data.error) {
      return data.error;
    }
  } catch {
    // Ignore json parsing errors and fall back to status text.
  }

  return response.statusText || "Request failed";
}

function persistAuth(token: string, user: unknown, remember: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  const storage = remember ? window.localStorage : window.sessionStorage;
  const fallbackStorage = remember ? window.sessionStorage : window.localStorage;

  storage.setItem(TOKEN_STORAGE_KEY, token);
  fallbackStorage.removeItem(TOKEN_STORAGE_KEY);

  const encodedToken = encodeURIComponent(token);
  if (remember) {
    const maxAge = 60 * 60 * 24 * 30;
    document.cookie = `${AUTH_COOKIE_KEY}=${encodedToken}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
  } else {
    document.cookie = `${AUTH_COOKIE_KEY}=${encodedToken}; Path=/; SameSite=Lax`;
  }

  if (user) {
    const serializedUser = JSON.stringify(user);
    storage.setItem(USER_STORAGE_KEY, serializedUser);
    fallbackStorage.removeItem(USER_STORAGE_KEY);
  }
}

function persistRefreshToken(refreshToken: string, remember: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  const storage = remember ? window.localStorage : window.sessionStorage;
  const fallbackStorage = remember ? window.sessionStorage : window.localStorage;

  storage.setItem(REFRESH_STORAGE_KEY, refreshToken);
  fallbackStorage.removeItem(REFRESH_STORAGE_KEY);
}

async function postAuth(
  endpoint: string,
  payload: AuthPayload,
): Promise<AuthResponse> {
  const response = await fetch(getAuthEndpoint(endpoint), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as AuthResponse;
}

export async function loginWithJwt(payload: AuthPayload, remember: boolean) {
  const data = await postAuth("/auth/login", payload);
  const token = extractToken(data);

  if (!token) {
    throw new Error("Login succeeded but no JWT token was returned by the API.");
  }

  persistAuth(token, data.user, remember);
}

export async function registerWithJwt(payload: AuthPayload, remember: boolean) {
  const data = await postAuth("/auth/register", payload);
  const token = extractToken(data);

  if (!token) {
    throw new Error("Registration succeeded but no JWT token was returned by the API.");
  }

  persistAuth(token, data.user, remember);
}

export function completeGoogleLoginFromUrl(remember: boolean) {
  if (typeof window === "undefined") {
    return { success: false, error: "window_unavailable" };
  }

  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (!accessToken) {
    return { success: false, error: "missing_access_token" };
  }

  persistAuth(accessToken, null, remember);
  if (refreshToken) {
    persistRefreshToken(refreshToken, remember);
  }

  const cleanUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`;
  window.history.replaceState({}, document.title, cleanUrl);
  return { success: true, error: null };
}

export function getStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }

  const storageToken =
    window.localStorage.getItem(TOKEN_STORAGE_KEY) ??
    window.sessionStorage.getItem(TOKEN_STORAGE_KEY);

  if (storageToken) {
    return storageToken;
  }

  const cookieMap = document.cookie
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((accumulator, pair) => {
      const [rawKey, ...rawValue] = pair.split("=");
      if (!rawKey) {
        return accumulator;
      }

      accumulator[rawKey] = rawValue.join("=");
      return accumulator;
    }, {});

  for (const cookieName of TOKEN_COOKIE_CANDIDATES) {
    const token = cookieMap[cookieName];
    if (token) {
      return decodeURIComponent(token);
    }
  }

  return null;
}

export function clearStoredAuth() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(REFRESH_STORAGE_KEY);
  window.sessionStorage.removeItem(REFRESH_STORAGE_KEY);
  window.localStorage.removeItem(USER_STORAGE_KEY);
  window.sessionStorage.removeItem(USER_STORAGE_KEY);
  document.cookie = `${AUTH_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export async function loginWithGoogle(nextPath = "/") {
  const safeNextPath = nextPath.startsWith("/") ? nextPath : "/";
  const callbackUrl = `${window.location.origin}/login?next=${encodeURIComponent(safeNextPath)}`;
  const next = encodeURIComponent(callbackUrl);
  window.location.href = `${GOOGLE_LOGIN_START_URL}?next=${next}`;
}
