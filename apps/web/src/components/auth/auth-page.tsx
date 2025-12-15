import { Link } from "react-router-dom";
import { AuthLoginInput, AuthRegisterInput } from "@trip-master/shared";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

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

export function AuthPage({ mode, onSubmit, isSubmitting, error }: AuthPageProps) {
  const heading = mode === "login" ? "Welcome back" : "Create your account";
  const subhead =
    mode === "login"
      ? "Sign in to start collaborating on your travel plans."
      : "Register to start planning and inviting collaborators.";

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Homelab Travel Planner</p>
          <CardTitle>{heading}</CardTitle>
          <CardDescription>{subhead}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const payload = {
                email: formData.get("email") as string,
                password: formData.get("password") as string,
                name: formData.get("name") as string
              };
              if (mode === "register") {
                onSubmit({ email: payload.email, password: payload.password, name: payload.name });
              } else {
                onSubmit({ email: payload.email, password: payload.password });
              }
            }}
          >
            {mode === "register" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" placeholder="Alex Doe" required />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="you@example.com" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                minLength={mode === "register" ? 8 : undefined}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Working..." : mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>
          <div className="mt-4 text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                Need an account?{" "}
                <Link to="/register" className="text-primary hover:underline">
                  Create one
                </Link>
                .
              </>
            ) : (
              <>
                Already registered?{" "}
                <Link to="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
                .
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
