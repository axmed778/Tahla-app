import { redirect } from "next/navigation";
import { verifyEmailToken } from "@/actions/auth";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ token?: string }> };

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token } = await searchParams;
  const raw = token?.trim();
  if (!raw) redirect("/lock?verify=invalid");
  const result = await verifyEmailToken(raw);
  redirect(result.ok ? "/lock?verify=success" : "/lock?verify=invalid");
}
