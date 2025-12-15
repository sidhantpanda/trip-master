import { useQuery } from "@tanstack/react-query";
import { HealthResponse, healthSchema } from "@trip-master/shared";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`);
  const data = await response.json();
  return healthSchema.parse(data);
}

function App() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth
  });

  return (
    <div className="app">
      <header>
        <h1>Homelab Travel Planner</h1>
        <p>Express + React/Vite + MongoDB scaffold</p>
      </header>
      <main>
        {isLoading && <p>Checking API health…</p>}
        {error && <p className="error">API unavailable</p>}
        {data && <p className="ok">API status: {data.ok ? "online" : "offline"}</p>}
      </main>
    </div>
  );
}

export default App;
