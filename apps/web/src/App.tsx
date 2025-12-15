import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { AuthLoginInput, AuthRegisterInput, AuthResponse, Trip } from "@trip-master/shared";
import {
  addCollaborator,
  createTrip,
  deleteTrip,
  fetchSession,
  fetchTrip,
  fetchTrips,
  loginUser,
  logout,
  registerUser,
  updateTrip,
  removeCollaborator
} from "./api";

function App() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const sessionQuery = useQuery({
    queryKey: ["session"],
    queryFn: fetchSession,
    retry: false
  });

  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      queryClient.setQueryData(["session"], data);
      navigate("/");
    }
  });

  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: (data) => {
      queryClient.setQueryData(["session"], data);
      navigate("/");
    }
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["session"], null);
      navigate("/login");
    }
  });

  return (
    <Routes>
      <Route
        path="/"
        element={
          <RequireAuth session={sessionQuery.data} loading={sessionQuery.isLoading}>
            <TripsPage
              user={sessionQuery.data?.user}
              loggingOut={logoutMutation.isPending}
              onLogout={() => logoutMutation.mutate()}
            />
          </RequireAuth>
        }
      />
      <Route
        path="/trips/:id"
        element={
          <RequireAuth session={sessionQuery.data} loading={sessionQuery.isLoading}>
            <TripDetailPage
              userId={sessionQuery.data?.user.id || ""}
              loggingOut={logoutMutation.isPending}
              onLogout={() => logoutMutation.mutate()}
            />
          </RequireAuth>
        }
      />
      <Route
        path="/login"
        element={
          <AuthPage
            mode="login"
            onSubmit={(values) => loginMutation.mutate(values)}
            isSubmitting={loginMutation.isPending}
            error={loginMutation.error instanceof Error ? loginMutation.error.message : undefined}
          />
        }
      />
      <Route
        path="/register"
        element={
          <AuthPage
            mode="register"
            onSubmit={(values) => registerMutation.mutate(values)}
            isSubmitting={registerMutation.isPending}
            error={registerMutation.error instanceof Error ? registerMutation.error.message : undefined}
          />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function RequireAuth({
  session,
  loading,
  children
}: {
  session: AuthResponse | null | undefined;
  loading: boolean;
  children: ReactNode;
}) {
  if (loading) {
    return <FullPageState title="Checking your session" note="Hang tight while we verify your login." />;
  }

  if (!session?.user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function FullPageState({ title, note }: { title: string; note?: string }) {
  return (
    <div className="page centered">
      <div className="card">
        <h1>{title}</h1>
        {note && <p className="muted">{note}</p>}
      </div>
    </div>
  );
}

type AuthMode = "login" | "register";

type AuthPageProps =
  | {
      mode: "login";
      onSubmit: (values: AuthLoginInput) => void;
      isSubmitting: boolean;
      error?: string;
    }
  | {
      mode: "register";
      onSubmit: (values: AuthRegisterInput) => void;
      isSubmitting: boolean;
      error?: string;
    };

function AuthPage({ mode, onSubmit, isSubmitting, error }: AuthPageProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const heading = mode === "login" ? "Welcome back" : "Create your account";
  const subhead =
    mode === "login"
      ? "Sign in to start collaborating on your travel plans."
      : "Register to start planning and inviting collaborators.";
  const switchText =
    mode === "login" ? (
      <p className="muted">
        Need an account? <Link to="/register">Create one</Link>.
      </p>
    ) : (
      <p className="muted">
        Already registered? <Link to="/login">Sign in</Link>.
      </p>
    );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (mode === "register") {
      onSubmit({ name, email, password });
    } else {
      onSubmit({ email, password });
    }
  };

  return (
    <div className="page centered">
      <div className="card auth-card">
        <div className="auth-header">
          <p className="eyebrow">Homelab Travel Planner</p>
          <h1>{heading}</h1>
          <p className="muted">{subhead}</p>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          {mode === "register" && (
            <label className="field">
              <span>Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Doe"
                required
              />
            </label>
          )}
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={mode === "register" ? 8 : undefined}
              required
            />
          </label>

          {error && <p className="error">{error}</p>}

          <button className="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Working..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        {switchText}
      </div>
    </div>
  );
}

function TripsPage({
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
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const tripsQuery = useQuery({
    queryKey: ["trips"],
    queryFn: fetchTrips
  });

  const createTripMutation = useMutation({
    mutationFn: createTrip,
    onSuccess: (trip) => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      setTitle("");
      setDestination("");
      setStartDate("");
      setEndDate("");
      navigate(`/trips/${trip.id}`);
    }
  });

  if (!user) return null;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Homelab Travel Planner</p>
          <h1>Welcome back, {user.name}.</h1>
          <p className="muted">Create trips, share with collaborators, and start filling your itinerary.</p>
        </div>
        <button className="ghost" onClick={onLogout} disabled={loggingOut}>
          {loggingOut ? "Signing out..." : "Sign out"}
        </button>
      </header>

      <div className="card-grid">
        <section className="card">
          <div className="section-header">
            <div>
              <p className="eyebrow">New trip</p>
              <h2>Create a trip</h2>
              <p className="muted">Set your destination and optional dates to get started.</p>
            </div>
          </div>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              createTripMutation.mutate({
                title,
                destination,
                startDate: startDate || undefined,
                endDate: endDate || undefined
              });
            }}
          >
            <label className="field">
              <span>Title</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Summer in Spain" required />
            </label>
            <label className="field">
              <span>Destination</span>
              <input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Barcelona, Spain"
                required
              />
            </label>
            <div className="input-row">
              <label className="field">
                <span>Start date</span>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </label>
              <label className="field">
                <span>End date</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </label>
            </div>
            {createTripMutation.error && (
              <p className="error">{createTripMutation.error instanceof Error ? createTripMutation.error.message : ""}</p>
            )}
            <button className="primary" type="submit" disabled={createTripMutation.isPending}>
              {createTripMutation.isPending ? "Creating..." : "Create trip"}
            </button>
          </form>
        </section>

        <section className="card">
          <div className="section-header">
            <div>
              <p className="eyebrow">Your trips</p>
              <h2>Recently updated</h2>
            </div>
          </div>
          {tripsQuery.isLoading && <p className="muted">Loading trips…</p>}
          {tripsQuery.error && <p className="error">Could not load trips.</p>}
          {tripsQuery.data && tripsQuery.data.length === 0 && <p className="muted">No trips yet. Create your first!</p>}
          <div className="trip-list">
            {tripsQuery.data?.map((trip) => (
              <Link key={trip.id} to={`/trips/${trip.id}`} className="trip-card">
                <div className="trip-card__header">
                  <h3>{trip.title}</h3>
                  <span className="badge">{trip.destination}</span>
                </div>
                <p className="muted">
                  {trip.startDate ? new Date(trip.startDate).toLocaleDateString() : "No dates set"}
                </p>
                <p className="muted">Last updated {new Date(trip.updatedAt).toLocaleDateString()}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function TripDetailPage({
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

  if (tripQuery.isLoading) {
    return <FullPageState title="Loading trip…" note="Fetching latest itinerary details." />;
  }
  if (tripQuery.error || !tripQuery.data) {
    return <FullPageState title="Trip not found" note="Check the link and try again." />;
  }

  const trip = tripQuery.data;
  const sortedDays = sortAndReindex(trip.days);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Trip</p>
          <h1>{trip.title}</h1>
          <p className="muted">
            {trip.destination} •{" "}
            {trip.startDate ? `${new Date(trip.startDate).toLocaleDateString()} → ` : ""}
            {trip.endDate ? new Date(trip.endDate).toLocaleDateString() : "Dates TBD"}
          </p>
        </div>
        <div className="button-stack">
          <button className="ghost" onClick={() => navigate("/")}>&larr; Trips</button>
          <button className="ghost" onClick={onLogout} disabled={loggingOut}>
            {loggingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </header>

      {!canEdit && (
        <div className="card">
          <p className="muted">You have viewer access. Ask the owner for editor access to make changes.</p>
        </div>
      )}

      <div className="card-grid">
        <section className="card">
          <div className="section-header">
            <div>
              <p className="eyebrow">Trip details</p>
              <h2>Overview</h2>
            </div>
            {isOwner && (
              <button
                className="ghost danger"
                onClick={() => deleteTripMutation.mutate()}
                disabled={deleteTripMutation.isPending}
              >
                {deleteTripMutation.isPending ? "Deleting..." : "Delete trip"}
              </button>
            )}
          </div>
          <form
            className="form"
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
            <label className="field">
              <span>Title</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit} required />
            </label>
            <label className="field">
              <span>Destination</span>
              <input value={destination} onChange={(e) => setDestination(e.target.value)} disabled={!canEdit} required />
            </label>
            <div className="input-row">
              <label className="field">
                <span>Start date</span>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={!canEdit} />
              </label>
              <label className="field">
                <span>End date</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={!canEdit} />
              </label>
            </div>
            <label className="field">
              <span>Timezone</span>
              <input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="Europe/Madrid"
                disabled={!canEdit}
              />
            </label>
            {updateTripMutation.error && (
              <p className="error">
                {updateTripMutation.error instanceof Error ? updateTripMutation.error.message : "Update failed"}
              </p>
            )}
            <button className="primary" type="submit" disabled={!canEdit || updateTripMutation.isPending}>
              {updateTripMutation.isPending ? "Saving..." : "Save changes"}
            </button>
          </form>
        </section>

        <section className="card">
          <div className="section-header">
            <div>
              <p className="eyebrow">Collaborators</p>
              <h2>Shared access</h2>
            </div>
          </div>
          <ul className="list">
            <li className="list-row">
              <div>
                <p>Owner</p>
                <p className="muted">{trip.ownerUserId === userId ? "You" : "Trip owner"}</p>
              </div>
              <span className="badge">owner</span>
            </li>
            {trip.collaborators.map((collab) => (
              <li key={collab.userId} className="list-row">
                <div>
                  <p>{collab.email}</p>
                  <p className="muted">Added {new Date(collab.invitedAt).toLocaleDateString()}</p>
                </div>
                <div className="list-row__actions">
                  <span className="badge">{collab.role}</span>
                  {isOwner && (
                    <button
                      className="ghost"
                      onClick={() => removeCollabMutation.mutate(collab.userId)}
                      disabled={removeCollabMutation.isPending}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {isOwner && (
            <form
              className="form"
              onSubmit={(e) => {
                e.preventDefault();
                inviteMutation.mutate();
              }}
            >
              <label className="field">
                <span>Invite by email</span>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="collaborator@example.com"
                  required
                />
              </label>
              <label className="field">
                <span>Role</span>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as "editor" | "viewer")}>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </label>
              {inviteMutation.error && (
                <p className="error">
                  {inviteMutation.error instanceof Error ? inviteMutation.error.message : "Invite failed"}
                </p>
              )}
              <button className="primary" type="submit" disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? "Inviting..." : "Send invite"}
              </button>
            </form>
          )}
        </section>
      </div>

      <section className="card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Itinerary</p>
            <h2>Day-by-day</h2>
          </div>
        </div>

        {sortedDays.length === 0 && <p className="muted">No itinerary items yet. Add your first stop below.</p>}
        <div className="day-grid">
          {sortedDays.map((day) => (
            <div className="subcard" key={day.id || day.date}>
              <div className="section-header">
                <div>
                  <p className="label">Day {day.dayIndex + 1}</p>
                  <h3>{new Date(day.date).toLocaleDateString()}</h3>
                </div>
              </div>
              {day.items.length === 0 && <p className="muted">No items yet.</p>}
              <ul className="list">
                {day.items.map((item) => (
                  <li key={item.id || item.title} className="list-row">
                    <div>
                      <p>{item.title}</p>
                      {item.notes && <p className="muted">{item.notes}</p>}
                    </div>
                    <div className="list-row__actions">
                      {item.startTime && <span className="badge">{item.startTime}</span>}
                      {canEdit && (
                        <div className="button-row">
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => beginEditItem(day.date, item)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="ghost danger"
                            onClick={() => removeItem(day.date, item.id)}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {canEdit && (
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              addItem();
            }}
          >
            <div className="input-row">
              <label className="field">
                <span>Date</span>
                <input
                  type="date"
                  value={itemDate}
                  onChange={(e) => setItemDate(e.target.value)}
                  placeholder="2024-08-01"
                />
              </label>
              <label className="field">
                <span>Title</span>
                <input
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  placeholder="Morning coffee at La Rambla"
                  required
                />
              </label>
            </div>
            <label className="field">
              <span>Notes</span>
              <input
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
                placeholder="Optional details, addresses, or links"
              />
            </label>
            <div className="button-row">
              <button className="primary" type="submit" disabled={updateTripMutation.isPending}>
                {updateTripMutation.isPending ? "Saving..." : editingItemId ? "Update item" : "Add item"}
              </button>
              {editingItemId && (
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setEditingItemId(null);
                    setItemTitle("");
                    setItemNotes("");
                    setItemDate("");
                  }}
                >
                  Cancel edit
                </button>
              )}
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

function sortAndReindex(days: Trip["days"]): Trip["days"] {
  return [...days]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((day, idx) => ({
      ...day,
      dayIndex: idx,
      items: (day.items ?? []).map((item) => ({ ...item }))
    }));
}

export default App;
