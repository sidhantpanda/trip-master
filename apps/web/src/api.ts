import {
  AuthLoginInput,
  AuthRegisterInput,
  AuthResponse,
  authResponseSchema,
  Trip,
  TripListResponse,
  CreateTripInput,
  UpdateTripInput,
  AddCollaboratorInput,
  UpdateCollaboratorInput,
  tripListSchema,
  tripSchema,
  SettingsResponse,
  settingsResponseSchema,
  UpdateSettingsInput,
  GenerateItineraryInput
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

async function parseTrip(response: Response): Promise<Trip> {
  const data = await response.json();
  return tripSchema.parse(data);
}

async function parseTripList(response: Response): Promise<TripListResponse> {
  const data = await response.json();
  return tripListSchema.parse(data);
}

async function parseSettings(response: Response): Promise<SettingsResponse> {
  const data = await response.json();
  return settingsResponseSchema.parse(data);
}

export async function fetchTrips(): Promise<TripListResponse> {
  const res = await fetch(`${API_BASE_URL}/trips`, {
    credentials: "include"
  });
  if (!res.ok) {
    throw new Error(await readError(res));
  }
  return parseTripList(res);
}

export async function fetchTrip(id: string): Promise<Trip> {
  const res = await fetch(`${API_BASE_URL}/trips/${id}`, {
    credentials: "include"
  });
  if (!res.ok) {
    throw new Error(await readError(res));
  }
  return parseTrip(res);
}

export async function createTrip(input: CreateTripInput): Promise<Trip> {
  const res = await fetch(`${API_BASE_URL}/trips`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input)
  });
  if (!res.ok) {
    throw new Error(await readError(res));
  }
  return parseTrip(res);
}

export async function updateTrip(id: string, input: UpdateTripInput): Promise<Trip> {
  const res = await fetch(`${API_BASE_URL}/trips/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input)
  });
  if (!res.ok) {
    throw new Error(await readError(res));
  }
  return parseTrip(res);
}

export async function deleteTrip(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/trips/${id}`, {
    method: "DELETE",
    credentials: "include"
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(await readError(res));
  }
}

export async function addCollaborator(tripId: string, input: AddCollaboratorInput): Promise<Trip> {
  const res = await fetch(`${API_BASE_URL}/trips/${tripId}/collaborators`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input)
  });
  if (!res.ok) {
    throw new Error(await readError(res));
  }
  return parseTrip(res);
}

export async function updateCollaborator(
  tripId: string,
  userId: string,
  input: UpdateCollaboratorInput
): Promise<Trip> {
  const res = await fetch(`${API_BASE_URL}/trips/${tripId}/collaborators/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input)
  });
  if (!res.ok) {
    throw new Error(await readError(res));
  }
  return parseTrip(res);
}

export async function removeCollaborator(tripId: string, userId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/trips/${tripId}/collaborators/${userId}`, {
    method: "DELETE",
    credentials: "include"
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(await readError(res));
  }
}

export async function fetchSettings(): Promise<SettingsResponse> {
  const res = await fetch(`${API_BASE_URL}/settings`, {
    credentials: "include"
  });
  if (!res.ok) {
    throw new Error(await readError(res));
  }
  return parseSettings(res);
}

export async function updateSettings(input: UpdateSettingsInput): Promise<SettingsResponse> {
  const res = await fetch(`${API_BASE_URL}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input)
  });
  if (!res.ok) {
    throw new Error(await readError(res));
  }
  return parseSettings(res);
}

export async function generateItinerary(tripId: string, input: GenerateItineraryInput): Promise<Trip> {
  const res = await fetch(`${API_BASE_URL}/trips/${tripId}/generate-itinerary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input)
  });
  if (!res.ok) {
    throw new Error(await readError(res));
  }
  return parseTrip(res);
}
