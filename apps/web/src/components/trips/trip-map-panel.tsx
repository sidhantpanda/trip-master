import { useEffect, useMemo, useRef, useState } from "react";
import { Trip } from "@trip-master/shared";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { loadGoogleMaps } from "../../lib/google-maps";
import { sortAndReindex } from "../../lib/trip-utils";

const travelModes = ["driving", "transit", "walking"] as const;

function formatDistance(distanceMeters?: number) {
  if (!distanceMeters) return "—";
  const km = distanceMeters / 1000;
  return `${km.toFixed(km >= 10 ? 0 : 1)} km`;
}

function formatDuration(durationSeconds?: number) {
  if (!durationSeconds) return "—";
  const minutes = Math.round(durationSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${minutes} min`;
  return `${hours}h ${remainder}m`;
}

export function TripMapPanel({
  trip,
  canEdit,
  onEnrichDay,
  onComputeRoutes,
  enriching,
  routing,
  error
}: {
  trip: Trip;
  canEdit: boolean;
  onEnrichDay: (dayIndex: number) => void;
  onComputeRoutes: (dayIndex: number, mode: "driving" | "transit" | "walking") => void;
  enriching: boolean;
  routing: boolean;
  error?: string;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const googleRef = useRef<typeof google | null>(null);

  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(() => trip.days[0]?.dayIndex ?? 0);
  const [mode, setMode] = useState<"driving" | "transit" | "walking">("driving");

  const sortedDays = useMemo(() => sortAndReindex(trip.days), [trip.days]);
  const activeDay = useMemo(
    () => sortedDays.find((day) => day.dayIndex === selectedDayIndex) ?? sortedDays[0],
    [sortedDays, selectedDayIndex]
  );

  useEffect(() => {
    if (!activeDay) return;
    setSelectedDayIndex(activeDay.dayIndex);
    setMode(activeDay.routes?.mode ?? "driving");
  }, [activeDay?.dayIndex, activeDay?.routes?.mode]);

  useEffect(() => {
    if (!activeDay) return;
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !mapRef.current) return;
    let cancelled = false;

    loadGoogleMaps(apiKey)
      .then((google) => {
        if (cancelled) return;
        googleRef.current = google;
        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new google.maps.Map(mapRef.current, {
            center: { lat: 20, lng: 0 },
            zoom: 2,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false
          });
        }
      })
      .catch(() => {
        // handled via UI message
      });

    return () => {
      cancelled = true;
    };
  }, [activeDay?.dayIndex]);

  useEffect(() => {
    const google = googleRef.current;
    const map = mapInstanceRef.current;
    if (!google || !map || !activeDay) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    const locations = activeDay.items
      .map((item) => item.location)
      .filter((loc): loc is { lat: number; lng: number } => loc?.lat !== undefined && loc?.lng !== undefined)
      .map((loc) => ({ lat: loc.lat, lng: loc.lng }));

    const bounds = new google.maps.LatLngBounds();
    locations.forEach((loc, idx) => {
      const marker = new google.maps.Marker({
        map,
        position: loc,
        label: `${idx + 1}`
      });
      markersRef.current.push(marker);
      bounds.extend(loc);
    });

    if (activeDay.routes?.polyline && google.maps.geometry?.encoding) {
      const path = google.maps.geometry.encoding.decodePath(activeDay.routes.polyline);
      polylineRef.current = new google.maps.Polyline({
        map,
        path,
        strokeColor: "#1f2937",
        strokeOpacity: 0.9,
        strokeWeight: 4
      });
      path.forEach((point) => bounds.extend(point));
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, 64);
    }
  }, [activeDay, mode, sortedDays.length]);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const routeStats = activeDay?.routes
    ? `${formatDistance(activeDay.routes.distanceMeters)} • ${formatDuration(activeDay.routes.durationSeconds)}`
    : "No route yet";

  return (
    <Card>
      <CardHeader>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Maps</p>
        <CardTitle>Daily routes</CardTitle>
        <CardDescription>Resolve places, compute routes, and preview the daily path.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedDays.length === 0 && (
          <p className="text-sm text-muted-foreground">Add itinerary items with locations to see them on the map.</p>
        )}
        {sortedDays.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <div className="space-y-1.5">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Day</p>
                <select
                  value={selectedDayIndex}
                  onChange={(e) => setSelectedDayIndex(Number(e.target.value))}
                  className="flex h-10 w-full min-w-[160px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {sortedDays.map((day) => (
                    <option key={day.dayIndex} value={day.dayIndex}>
                      Day {day.dayIndex + 1} • {new Date(day.date).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Mode</p>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as typeof travelModes[number])}
                  className="flex h-10 w-full min-w-[160px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {travelModes.map((modeOption) => (
                    <option key={modeOption} value={modeOption}>
                      {modeOption}
                    </option>
                  ))}
                </select>
              </div>
              <Badge variant="outline">{routeStats}</Badge>
            </div>

            {canEdit && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={() => activeDay && onEnrichDay(activeDay.dayIndex)}
                  disabled={enriching || !activeDay}
                >
                  {enriching ? "Enriching..." : "Enrich places"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => activeDay && onComputeRoutes(activeDay.dayIndex, mode)}
                  disabled={routing || !activeDay}
                >
                  {routing ? "Computing..." : "Compute routes"}
                </Button>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            {!apiKey && (
              <p className="text-sm text-muted-foreground">
                Set <code className="rounded bg-muted px-1 py-0.5">VITE_GOOGLE_MAPS_API_KEY</code> to enable maps.
              </p>
            )}

            <div ref={mapRef} className="h-[320px] w-full rounded-lg border bg-muted/10" />
          </>
        )}
      </CardContent>
    </Card>
  );
}
