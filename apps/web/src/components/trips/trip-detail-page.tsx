import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Trip } from "@trip-master/shared";
import {
  addCollaborator,
  deleteTrip,
  fetchTrip,
  removeCollaborator,
  updateTrip
} from "../../api";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Textarea } from "../ui/textarea";
import { FullPageState } from "../full-page-state";
import { sortAndReindex } from "../../lib/trip-utils";

export function TripDetailPage({
  userId,
  onLogout,
  loggingOut
}: {
  userId: string;
  onLogout: () => void;
  loggingOut: boolean;
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [timezone, setTimezone] = useState("");
  const [itemTitle, setItemTitle] = useState("");
  const [itemDate, setItemDate] = useState("");
  const [itemNotes, setItemNotes] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("viewer");

  const tripQuery = useQuery({
    queryKey: ["trip", id],
    queryFn: () => fetchTrip(id || ""),
    enabled: Boolean(id)
  });

  const canEdit = useMemo(() => {
    const trip = tripQuery.data;
    if (!trip) return false;
    if (trip.ownerUserId === userId) return true;
    const collab = trip.collaborators.find((c) => c.userId === userId);
    return collab?.role === "editor";
  }, [tripQuery.data, userId]);

  const isOwner = useMemo(() => tripQuery.data?.ownerUserId === userId, [tripQuery.data, userId]);

  useEffect(() => {
    if (tripQuery.data) {
      setTitle(tripQuery.data.title);
      setDestination(tripQuery.data.destination);
      setStartDate(tripQuery.data.startDate ? tripQuery.data.startDate.slice(0, 10) : "");
      setEndDate(tripQuery.data.endDate ? tripQuery.data.endDate.slice(0, 10) : "");
      setTimezone(tripQuery.data.timezone || "");
    }
  }, [tripQuery.data]);

  const updateTripMutation = useMutation({
    mutationFn: (payload: any) => updateTrip(id || "", payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(["trip", id], updated);
      queryClient.invalidateQueries({ queryKey: ["trips"] });
    }
  });

  const deleteTripMutation = useMutation({
    mutationFn: () => deleteTrip(id || ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      navigate("/");
    }
  });

  const inviteMutation = useMutation({
    mutationFn: () => addCollaborator(id || "", { email: inviteEmail, role: inviteRole }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["trip", id], updated);
      setInviteEmail("");
      setInviteRole("viewer");
    }
  });

  const removeCollabMutation = useMutation({
    mutationFn: (userToRemove: string) => removeCollaborator(id || "", userToRemove),
    onSuccess: () => {
      tripQuery.refetch();
    }
  });

  const addItem = () => {
    const trip = tripQuery.data;
    if (!trip || !itemTitle) return;

    const targetDate = itemDate || trip.startDate || new Date().toISOString().slice(0, 10);
    const days: Trip["days"] = [...trip.days];
    const dayKey = targetDate.slice(0, 10);
    let targetDay = days.find((d) => d.date.slice(0, 10) === dayKey);
    if (!targetDay) {
      targetDay = { dayIndex: days.length, date: targetDate, items: [], routes: undefined };
      days.push(targetDay);
    }

    if (editingItemId) {
      targetDay.items = targetDay.items.map((existing) =>
        (existing.id || "") === editingItemId
          ? { ...existing, title: itemTitle, notes: itemNotes || undefined }
          : existing
      );
    } else {
      targetDay.items = [
        ...targetDay.items,
        {
          title: itemTitle,
          notes: itemNotes || undefined
        }
      ];
    }

    const normalizedDays = sortAndReindex(days).filter((day) => day.items.length > 0);
    updateTripMutation.mutate({ days: normalizedDays });
    setItemTitle("");
    setItemNotes("");
    setItemDate("");
    setEditingItemId(null);
  };

  const beginEditItem = (dayDate: string, item: Trip["days"][number]["items"][number]) => {
    setItemDate(dayDate.slice(0, 10));
    setItemTitle(item.title);
    setItemNotes(item.notes || "");
    setEditingItemId(item.id || null);
  };

  const removeItem = (dayDate: string, itemId?: string) => {
    if (!itemId || !tripQuery.data) return;
    const updatedDays = sortAndReindex(
      tripQuery.data.days
        .map((day) =>
          day.date.slice(0, 10) === dayDate.slice(0, 10)
            ? { ...day, items: day.items.filter((item) => (item.id || "") !== itemId) }
            : day
        )
        .filter((day) => day.items.length > 0)
    );
    updateTripMutation.mutate({ days: updatedDays });
    if (editingItemId === itemId) {
      setEditingItemId(null);
      setItemTitle("");
      setItemNotes("");
      setItemDate("");
    }
  };

  if (tripQuery.isLoading) {
    return <FullPageState title="Loading trip…" note="Fetching latest itinerary details." />;
  }
  if (tripQuery.error || !tripQuery.data) {
    return <FullPageState title="Trip not found" note="Check the link and try again." />;
  }

  const trip = tripQuery.data;
  const sortedDays = sortAndReindex(trip.days);

  return (
    <div className="container py-10 space-y-8">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Trip</p>
          <h1 className="text-3xl font-semibold">{trip.title}</h1>
          <p className="text-muted-foreground">
            {trip.destination} • {trip.startDate ? `${new Date(trip.startDate).toLocaleDateString()} → ` : ""}
            {trip.endDate ? new Date(trip.endDate).toLocaleDateString() : "Dates TBD"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate("/")}>
            ← Trips
          </Button>
          <Button variant="ghost" onClick={onLogout} disabled={loggingOut}>
            {loggingOut ? "Signing out..." : "Sign out"}
          </Button>
        </div>
      </header>

      {!canEdit && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              You have viewer access. Ask the owner for editor access to make changes.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Trip details</p>
              <CardTitle>Overview</CardTitle>
            </div>
            {isOwner && (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => deleteTripMutation.mutate()}
                disabled={deleteTripMutation.isPending}
              >
                {deleteTripMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                updateTripMutation.mutate({
                  title,
                  destination,
                  startDate: startDate || undefined,
                  endDate: endDate || undefined,
                  timezone: timezone || undefined
                });
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="destination">Destination</Label>
                <Input
                  id="destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  disabled={!canEdit}
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="startDate">Start date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="endDate">End date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="Europe/Madrid"
                  disabled={!canEdit}
                />
              </div>
              {updateTripMutation.error && (
                <p className="text-sm text-destructive">
                  {updateTripMutation.error instanceof Error ? updateTripMutation.error.message : "Update failed"}
                </p>
              )}
              <Button type="submit" disabled={!canEdit || updateTripMutation.isPending}>
                {updateTripMutation.isPending ? "Saving..." : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Collaborators</p>
            <CardTitle>Shared access</CardTitle>
            <CardDescription>Invite teammates or remove collaborators.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="font-medium">Owner</p>
                  <p className="text-sm text-muted-foreground">{trip.ownerUserId === userId ? "You" : "Trip owner"}</p>
                </div>
                <Badge variant="outline">owner</Badge>
              </div>
              {trip.collaborators.map((collab) => (
                <div key={collab.userId} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="font-medium">{collab.email}</p>
                    <p className="text-sm text-muted-foreground">
                      Added {new Date(collab.invitedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{collab.role}</Badge>
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCollabMutation.mutate(collab.userId)}
                        disabled={removeCollabMutation.isPending}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {isOwner && (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  inviteMutation.mutate();
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="invite-email">Invite by email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="collaborator@example.com"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invite-role">Role</Label>
                  <select
                    id="invite-role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as "editor" | "viewer")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                {inviteMutation.error && (
                  <p className="text-sm text-destructive">
                    {inviteMutation.error instanceof Error ? inviteMutation.error.message : "Invite failed"}
                  </p>
                )}
                <Button type="submit" disabled={inviteMutation.isPending}>
                  {inviteMutation.isPending ? "Inviting..." : "Send invite"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Itinerary</p>
          <CardTitle>Day-by-day</CardTitle>
          <CardDescription>Manual itinerary editing; generation comes in later phases.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sortedDays.length === 0 && <p className="text-muted-foreground">No itinerary items yet. Add your first stop below.</p>}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {sortedDays.map((day) => (
              <div key={day.id || day.date} className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Day {day.dayIndex + 1}</p>
                    <p className="font-semibold">{new Date(day.date).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="outline">{day.items.length} stops</Badge>
                </div>
                {day.items.length === 0 && <p className="text-muted-foreground text-sm">No items yet.</p>}
                <div className="space-y-2">
                  {day.items.map((item) => (
                    <div
                      key={item.id || item.title}
                      className="rounded-md border p-3 bg-muted/20 flex items-start justify-between gap-2"
                    >
                      <div>
                        <p className="font-medium">{item.title}</p>
                        {item.notes && <p className="text-sm text-muted-foreground">{item.notes}</p>}
                      </div>
                      {canEdit && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => beginEditItem(day.date, item)}>
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => removeItem(day.date, item.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {canEdit && (
            <form
              className="grid gap-3 md:grid-cols-[1fr_1fr] lg:grid-cols-[1fr_1fr] items-end"
              onSubmit={(e) => {
                e.preventDefault();
                addItem();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="item-date">Date</Label>
                <Input
                  id="item-date"
                  type="date"
                  value={itemDate}
                  onChange={(e) => setItemDate(e.target.value)}
                  placeholder="2024-08-01"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="item-title">Title</Label>
                <Input
                  id="item-title"
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  placeholder="Morning coffee at La Rambla"
                  required
                />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label htmlFor="item-notes">Notes</Label>
                <Textarea
                  id="item-notes"
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  placeholder="Optional details, addresses, or links"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={updateTripMutation.isPending}>
                  {updateTripMutation.isPending ? "Saving..." : editingItemId ? "Update item" : "Add item"}
                </Button>
                {editingItemId && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setEditingItemId(null);
                      setItemTitle("");
                      setItemNotes("");
                      setItemDate("");
                    }}
                  >
                    Cancel edit
                  </Button>
                )}
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
