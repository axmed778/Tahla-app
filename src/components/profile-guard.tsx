"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

type User = { id: string; firstName: string; lastName: string; isMaster: boolean; personId: string | null };

export function ProfileGuard({ user, children }: { user: User | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    if (user.personId == null && pathname !== "/profile/complete") {
      router.replace("/profile/complete");
    }
  }, [user, pathname, router]);

  return <>{children}</>;
}
