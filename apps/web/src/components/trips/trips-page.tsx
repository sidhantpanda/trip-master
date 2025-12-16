import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { AuthResponse } from "@trip-master/shared";
import { createTrip, fetchTrips } from "../../api";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { DatePickerField } from "../date-picker-field";
import { useState } from "react";
import { format } from "date-fns";

export function TripsPage({
  user,
  onLogout,
  loggingOut
}: {
  user?: AuthResponse["user"];
  onLogout: () => void;
  loggingOut: boolean;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const tripsQuery = useQuery({
    queryKey: ["trips"],
    queryFn: fetchTrips
  });

  const createTripMutation = useMutation({
    mutationFn: createTrip,
    onSuccess: (trip) => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      navigate(`/trips/${trip.id}`);
    }
  });

  if (!user) return null;

  return (
    <div className="container py-10 space-y-8">
      <header className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Homelab Travel Planner</p>
          <h1 className="text-3xl font-semibold">Welcome back, {user.name}.</h1>
          <p className="text-muted-foreground">
            Create trips, share with collaborators, and start filling your itinerary.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate("/settings")}>
            Settings
          </Button>
          <Button variant="ghost" onClick={onLogout} disabled={loggingOut}>
            {loggingOut ? "Signing out..." : "Sign out"}
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">New trip</p>
            <CardTitle>Create a trip</CardTitle>
            <CardDescription>Set your destination and optional dates to get started.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const title = formData.get("title") as string;
                const destination = formData.get("destination") as string;
                createTripMutation.mutate({
                  title,
                  destination,
                  startDate: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
                  endDate: endDate ? format(endDate, "yyyy-MM-dd") : undefined
                });
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" placeholder="Summer in Spain" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="destination">Destination</Label>
                <Input id="destination" name="destination" placeholder="Barcelona, Spain" required />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <DatePickerField
                  id="startDate"
                  label="Start date"
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Select start"
                />
                <DatePickerField
                  id="endDate"
                  label="End date"
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="Select end"
                />
              </div>
              {createTripMutation.error && (
                <p className="text-sm text-destructive">
                  {createTripMutation.error instanceof Error ? createTripMutation.error.message : "Create failed"}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={createTripMutation.isPending}>
                {createTripMutation.isPending ? "Creating..." : "Create trip"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Your trips</p>
            <CardTitle>Recently updated</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tripsQuery.isLoading && <p className="text-muted-foreground">Loading trips…</p>}
            {tripsQuery.error && <p className="text-destructive">Could not load trips.</p>}
            {tripsQuery.data && tripsQuery.data.length === 0 && (
              <p className="text-muted-foreground">No trips yet. Create your first!</p>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              {tripsQuery.data?.map((trip) => (
                <Link
                  key={trip.id}
                  to={`/trips/${trip.id}`}
                  className="rounded-xl border bg-card p-4 transition hover:border-primary/70 hover:shadow"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold">{trip.title}</h3>
                    <Badge variant="outline">{trip.destination}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {trip.startDate ? new Date(trip.startDate).toLocaleDateString() : "No dates set"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Updated {new Date(trip.updatedAt).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
