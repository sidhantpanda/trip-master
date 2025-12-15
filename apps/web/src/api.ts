import {
  AuthLoginInput,
  AuthRegisterInput,
  AuthResponse,
  authResponseSchema
} from "@trip-master/shared";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

async function parseAuthResponse(response: Response): Promise<AuthResponse> {
  const data = await response.json();
  return authResponseSchema.parse(data);
}

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body?.error === "string") {
      return body.error;
    }
  } catch {
    // ignore
  }
  return response.statusText || "Request failed";
}

async function refreshSession(): Promise<AuthResponse | null> {
  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include"
  });

  if (!res.ok) {
    return null;
  }

  return parseAuthResponse(res);
}

export async function fetchSession(): Promise<AuthResponse | null> {
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    credentials: "include"
  });

  if (res.status === 401) {
    return refreshSession();
  }

  if (!res.ok) {
    throw new Error("Failed to load session");
  }

  return parseAuthResponse(res);
}

export async function registerUser(input: AuthRegisterInput): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input)
  });

  if (!res.ok) {
    throw new Error(await readError(res));
  }

  return parseAuthResponse(res);
}

export async function loginUser(input: AuthLoginInput): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input)
  });

  if (!res.ok) {
    throw new Error(await readError(res));
  }

  return parseAuthResponse(res);
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    credentials: "include"
  });
}
