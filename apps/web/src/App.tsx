import { type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { AuthResponse } from "@trip-master/shared";
import { fetchSession, loginUser, logout, registerUser } from "./api";
import { AuthPage } from "./components/auth/auth-page";
import { TripsPage } from "./components/trips/trips-page";
import { TripDetailPage } from "./components/trips/trip-detail-page";
import { FullPageState } from "./components/full-page-state";

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

export default App;
