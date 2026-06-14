import Link from "next/link";
import type { Person } from "@prisma/client";
import { formatPersonName } from "@/lib/utils";
import type { Locale } from "@/lib/i18n-config";

type Props = {
  person: Person;
  parents: Person[];
  spouse: Person | null;
  children: Person[];
  siblings: Person[];
  locale: Locale;
};

export function MiniTree({ person, parents, spouse, children, siblings, locale }: Props) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
      {/* Parents row */}
      {parents.length > 0 && (
        <div className="flex justify-center gap-2">
          {parents.map((p) => (
            <Link
              key={p.id}
              href={`/people/${p.id}`}
              className="rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
            >
              {formatPersonName(p, locale)}
            </Link>
          ))}
        </div>
      )}
      {/* Central: person + spouse */}
      <div className="flex justify-center items-center gap-4 flex-wrap">
        <Link
          href={`/people/${person.id}`}
          className="rounded-md border-2 border-primary bg-primary/10 px-4 py-2 font-medium text-sm"
        >
          {formatPersonName(person, locale)}
        </Link>
        {spouse && (
          <Link
            href={`/people/${spouse.id}`}
            className="rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
          >
            {formatPersonName(spouse, locale)}
          </Link>
        )}
      </div>
      {/* Children row */}
      {children.length > 0 && (
        <div className="flex justify-center gap-2 flex-wrap">
          {children.map((p) => (
            <Link
              key={p.id}
              href={`/people/${p.id}`}
              className="rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
            >
              {formatPersonName(p, locale)}
            </Link>
          ))}
        </div>
      )}
      {/* Siblings */}
      {siblings.length > 0 && (
        <div className="border-t pt-3">
          <p className="text-xs text-muted-foreground mb-2">Siblings</p>
          <div className="flex flex-wrap gap-2">
            {siblings.map((p) => (
              <Link
                key={p.id}
                href={`/people/${p.id}`}
                className="rounded-md border bg-background px-2 py-1 text-sm hover:bg-muted"
              >
                {formatPersonName(p, locale)}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
