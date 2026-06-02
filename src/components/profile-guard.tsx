"use client";

type User = { id: string; firstName: string; lastName: string; isMaster: boolean; personId: string | null };

/**
 * ProfileGuard no longer redirects to /profile/complete.
 * That page is shown only after first registration/login (in auth actions)
 * or when the user opens it from Settings → "My profile" / "Complete your profile".
 */
export function ProfileGuard({ user, children }: { user: User | null; children: React.ReactNode }) {
  return <>{children}</>;
}
