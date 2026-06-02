import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { getCurrentUser } from "@/actions/auth";
import { listPendingRelationshipRequests, respondToRelationshipRequest } from "@/actions/relationship-requests";

function RequestRow({
  id,
  fromName,
  type,
  label,
}: {
  id: string;
  fromName: string;
  type: string;
  label: string | null;
}) {
  async function accept() {
    "use server";
    await respondToRelationshipRequest(id, "ACCEPT");
  }
  async function decline() {
    "use server";
    await respondToRelationshipRequest(id, "DECLINE");
  }
  const pretty = type === "OTHER" ? (label ? `Other (${label})` : "Other") : type.charAt(0) + type.slice(1).toLowerCase();
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm">
        <span className="font-medium">{fromName}</span> wants to add you as their{" "}
        <span className="font-medium">{pretty}</span>.
      </div>
      <div className="flex gap-2">
        <form action={accept}>
          <button className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">Accept</button>
        </form>
        <form action={decline}>
          <button className="rounded-md border px-3 py-1.5 text-sm">Decline</button>
        </form>
      </div>
    </div>
  );
}

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const requests = await listPendingRelationshipRequests();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      <main className="container mx-auto max-w-2xl px-4 py-6">
        <div className="mb-6">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
        </div>

        <h2 className="text-xl font-semibold mb-6">Notifications</h2>

        <section className="space-y-3">
          <h3 className="text-base font-semibold">Relative requests</h3>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending requests.</p>
          ) : (
            requests.map((r) => (
              <RequestRow key={r.id} id={r.id} fromName={r.fromName} type={r.type} label={r.label} />
            ))
          )}
        </section>
      </main>
    </div>
  );
}

