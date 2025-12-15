import { FormEvent, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { AuthLoginInput, AuthRegisterInput, AuthResponse } from "@trip-master/shared";
import { fetchSession, loginUser, logout, registerUser } from "./api";

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
            <Dashboard
              user={sessionQuery.data?.user}
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

function Dashboard({
  user,
  onLogout,
  loggingOut
}: {
  user?: AuthResponse["user"];
  onLogout: () => void;
  loggingOut: boolean;
}) {
  if (!user) {
    return null;
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Homelab Travel Planner</p>
          <h1>Welcome back, {user.name}.</h1>
          <p className="muted">You are signed in and ready to start planning your next trip.</p>
        </div>
        <button className="ghost" onClick={onLogout} disabled={loggingOut}>
          {loggingOut ? "Signing out..." : "Sign out"}
        </button>
      </header>

      <section className="card">
        <h2>Your account</h2>
        <div className="user-meta">
          <div>
            <p className="label">Name</p>
            <p>{user.name}</p>
          </div>
          <div>
            <p className="label">Email</p>
            <p>{user.email}</p>
          </div>
          <div>
            <p className="label">Member since</p>
            <p>{new Date(user.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

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

export default App;
