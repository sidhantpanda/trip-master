import { TripDocument } from "../models/Trip";
import { TripLink, TripLocation } from "@trip-master/shared";
import { findPlaceFromText, getDirections } from "../integrations/maps/googleMaps";

function ensureLink(links: TripLink[] | undefined, label: string, url: string): TripLink[] {
  const existing = (links ?? []).some(
    (link) => link.label.toLowerCase() === label.toLowerCase() || link.url === url
  );
  if (existing) return links ?? [];
  return [...(links ?? []), { label, url }];
}

function buildLocationQuery(itemTitle: string, location: TripLocation | undefined, destination: string) {
  const namePart = location?.name || itemTitle;
  const addressPart = location?.address;
  return [namePart, addressPart, destination].filter(Boolean).join(", ");
}

function mergeLocation(existing: TripLocation | undefined, update: TripLocation): TripLocation {
  return {
    name: existing?.name ?? update.name,
    address: existing?.address ?? update.address,
    placeId: existing?.placeId ?? update.placeId,
    lat: existing?.lat ?? update.lat,
    lng: existing?.lng ?? update.lng
  };
}

export async function enrichTripPlaces(trip: TripDocument, apiKey: string, dayIndex?: number) {
  const days = trip.days.filter((day) => (dayIndex === undefined ? true : day.dayIndex === dayIndex));
  let updated = false;
  let updatedItems = 0;

  for (const day of days) {
    for (const item of day.items) {
      const needsLocation =
        !item.location?.placeId ||
        item.location?.lat === undefined ||
        item.location?.lng === undefined ||
        !item.location?.address;

      if (!needsLocation) {
        continue;
      }

      const query = buildLocationQuery(item.title, item.location, trip.destination);
      if (!query) continue;

      const place = await findPlaceFromText(query, apiKey);
      if (!place) continue;

      const locationUpdate: TripLocation = {
        name: place.name,
        address: place.address,
        placeId: place.placeId,
        lat: place.lat,
        lng: place.lng
      };
      item.location = mergeLocation(item.location, locationUpdate);

      const mapsQuery = place.placeId ? `place_id:${place.placeId}` : query;
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      const bookingUrl = `https://www.google.com/search?q=${encodeURIComponent(`${query} booking`)}`;

      item.links = ensureLink(item.links, "Google Maps", mapsUrl);
      item.links = ensureLink(item.links, "Search", searchUrl);
      item.links = ensureLink(item.links, "Booking", bookingUrl);

      updated = true;
      updatedItems += 1;
    }
  }

  return { updated, updatedItems };
}

export async function computeTripRoutes(
  trip: TripDocument,
  apiKey: string,
  options: { dayIndex?: number; mode: "driving" | "transit" | "walking" }
) {
  const days = trip.days.filter((day) => (options.dayIndex === undefined ? true : day.dayIndex === options.dayIndex));
  let updated = false;
  let updatedDays = 0;

  for (const day of days) {
    const points = day.items
      .map((item) => item.location)
      .filter((loc): loc is TripLocation => Boolean(loc?.lat !== undefined && loc?.lng !== undefined))
      .map((loc) => ({ lat: loc.lat as number, lng: loc.lng as number }));

    if (points.length < 2) {
      continue;
    }

    const directions = await getDirections(points, options.mode, apiKey);
    if (!directions) {
      continue;
    }

    day.routes = {
      mode: options.mode,
      polyline: directions.polyline,
      distanceMeters: directions.distanceMeters,
      durationSeconds: directions.durationSeconds
    };
    updated = true;
    updatedDays += 1;
  }

  return { updated, updatedDays };
}
