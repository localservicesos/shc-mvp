export const metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-sm text-muted-foreground">
        Today&apos;s jobs, upcoming work, and quick actions will live here.
      </p>
    </div>
  );
}
