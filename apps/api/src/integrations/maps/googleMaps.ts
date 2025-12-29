export type PlaceResult = {
  placeId: string;
  name?: string;
  address?: string;
  lat: number;
  lng: number;
};

export type DirectionsResult = {
  polyline: string;
  distanceMeters: number;
  durationSeconds: number;
};

type GooglePlacesResponse = {
  status: string;
  error_message?: string;
  candidates?: Array<{
    place_id: string;
    name?: string;
    formatted_address?: string;
    geometry?: { location?: { lat: number; lng: number } };
  }>;
};

type GoogleDirectionsResponse = {
  status: string;
  error_message?: string;
  routes?: Array<{
    overview_polyline?: { points?: string };
    legs?: Array<{ distance?: { value?: number }; duration?: { value?: number } }>;
  }>;
};

function normalizeGoogleError(status: string, message?: string) {
  if (status === "OK" || status === "ZERO_RESULTS") return null;
  return message || `Google Maps error: ${status}`;
}

export async function findPlaceFromText(input: string, apiKey: string): Promise<PlaceResult | null> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/findplacefromtext/json");
  url.searchParams.set("input", input);
  url.searchParams.set("inputtype", "textquery");
  url.searchParams.set("fields", "place_id,name,formatted_address,geometry");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Places API request failed: ${res.status}`);
  }

  const data = (await res.json()) as GooglePlacesResponse;
  const error = normalizeGoogleError(data.status, data.error_message);
  if (error) {
    throw new Error(error);
  }

  const candidate = data.candidates?.[0];
  if (!candidate || !candidate.geometry?.location || !candidate.place_id) {
    return null;
  }

  return {
    placeId: candidate.place_id,
    name: candidate.name,
    address: candidate.formatted_address,
    lat: candidate.geometry.location.lat,
    lng: candidate.geometry.location.lng
  };
}

export async function getDirections(
  points: Array<{ lat: number; lng: number }>,
  mode: "driving" | "transit" | "walking",
  apiKey: string
): Promise<DirectionsResult | null> {
  if (points.length < 2) {
    return null;
  }

  const origin = points[0];
  const destination = points[points.length - 1];
  const waypoints = points.slice(1, -1);

  const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
  url.searchParams.set("origin", `${origin.lat},${origin.lng}`);
  url.searchParams.set("destination", `${destination.lat},${destination.lng}`);
  url.searchParams.set("mode", mode);
  if (waypoints.length > 0) {
    url.searchParams.set(
      "waypoints",
      waypoints.map((point) => `${point.lat},${point.lng}`).join("|")
    );
  }
  url.searchParams.set("key", apiKey);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Directions API request failed: ${res.status}`);
  }

  const data = (await res.json()) as GoogleDirectionsResponse;
  const error = normalizeGoogleError(data.status, data.error_message);
  if (error) {
    throw new Error(error);
  }

  const route = data.routes?.[0];
  const polyline = route?.overview_polyline?.points;
  if (!route || !polyline) {
    return null;
  }

  const legs = route.legs ?? [];
  const totals = legs.reduce(
    (acc, leg) => {
      acc.distance += leg.distance?.value ?? 0;
      acc.duration += leg.duration?.value ?? 0;
      return acc;
    },
    { distance: 0, duration: 0 }
  );

  return {
    polyline,
    distanceMeters: totals.distance,
    durationSeconds: totals.duration
  };
}
