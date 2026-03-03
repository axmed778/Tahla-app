import { getDirectoryPeople } from "@/lib/directory";
import { DirectoryClient } from "./directory-client";

type Props = {
  searchParams: Promise<{ q?: string; city?: string; maritalStatus?: string; gender?: string; sort?: string; page?: string }>;
};

export async function Directory({ searchParams }: Props) {
  const params = await searchParams;
  const { people, total, totalPages, cities, page } = await getDirectoryPeople({
    q: params.q,
    city: params.city,
    maritalStatus: params.maritalStatus,
    gender: params.gender,
    sort: params.sort === "name" ? "name" : "updatedAt",
    page: params.page ? parseInt(params.page, 10) : 1,
  });

  return (
    <DirectoryClient
      initialPeople={people}
      total={total}
      totalPages={totalPages}
      cities={cities}
      currentPage={page}
      searchParams={params}
    />
  );
}
