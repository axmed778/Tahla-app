import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { prisma } from "@/lib/db";

export default async function TreePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/lock");

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const defaultPersonId = settings?.defaultTreePersonId;

  if (defaultPersonId) {
    const person = await prisma.person.findUnique({ where: { id: defaultPersonId } });
    if (person) redirect(`/tree/${person.id}`);
  }

  if (user.personId) redirect(`/tree/${user.personId}`);

  redirect("/");
}
