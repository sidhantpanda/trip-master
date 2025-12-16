import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchSettings, updateSettings } from "../../api";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { FullPageState } from "../full-page-state";

const providers = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "gemini", label: "Gemini" },
  { value: "mock", label: "Mock (offline stub)" }
];

export function SettingsPage({
  onLogout,
  loggingOut
}: {
  onLogout: () => void;
  loggingOut: boolean;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings
  });

  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(["settings"], data);
    }
  });

  if (settingsQuery.isLoading) {
    return <FullPageState title="Loading settings…" />;
  }

  if (settingsQuery.error || !settingsQuery.data) {
    return <FullPageState title="Unable to load settings" note="Try refreshing the page." />;
  }

  const settings = settingsQuery.data.settings;

  return (
    <div className="container py-10 space-y-6">
      <header className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Account</p>
          <h1 className="text-3xl font-semibold">LLM settings</h1>
          <p className="text-muted-foreground">Choose your provider, model, and API key.</p>
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

      <Card>
        <CardHeader>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">LLM</p>
          <CardTitle>Provider & credentials</CardTitle>
          <CardDescription>API keys are encrypted at rest (AES-GCM) and never sent to the client.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const formData = new FormData(form);
              updateMutation.mutate({
                llmProvider: formData.get("provider") as string,
                llmModel: (formData.get("model") as string) || undefined,
                apiKey: (formData.get("apiKey") as string) || undefined
              });
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="provider">Provider</Label>
                <select
                  id="provider"
                  name="provider"
                  defaultValue={settings.llmProvider}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {providers.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="model">Model</Label>
                <Input id="model" name="model" defaultValue={settings.llmModel ?? ""} placeholder="gpt-4o-mini" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apiKey">API key</Label>
              <Input
                id="apiKey"
                name="apiKey"
                type="password"
                placeholder="sk-..."
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to keep existing. Keys are stored encrypted and never returned in responses.
              </p>
            </div>
            {updateMutation.error && (
              <p className="text-sm text-destructive">
                {updateMutation.error instanceof Error ? updateMutation.error.message : "Update failed"}
              </p>
            )}
            {updateMutation.isSuccess && <p className="text-sm text-muted-foreground">Settings saved.</p>}
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save settings"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
