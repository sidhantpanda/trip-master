export function FullPageState({ title, note }: { title: string; note?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-lg space-y-2 text-center">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {note && <p className="text-muted-foreground">{note}</p>}
      </div>
    </div>
  );
}
