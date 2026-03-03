import Link from "next/link";
import type { Person, PersonPhone, PersonEmail, PersonTag, Tag, Relationship } from "@prisma/client";

type PersonWithRelations = Person & {
  phones: PersonPhone[];
  emails: PersonEmail[];
  tags: (PersonTag & { tag: Tag })[];
  relationshipsFrom: (Relationship & { toPerson: Person })[];
  relationshipsTo: (Relationship & { fromPerson: Person })[];
};

type Props = {
  person: PersonWithRelations;
  age: number | null;
  formatDate: (d: Date | null) => string;
  parents: Person[];
  children: Person[];
  siblings: Person[];
  spouse: Person | null;
  other: { person: Person; label: string | null }[];
};

export function PersonProfile({ person, age, formatDate, parents, children, siblings, spouse, other }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">
          {person.firstName} {person.middleName && `${person.middleName} `}{person.lastName}
        </h2>
        {person.tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {person.tags.map((t) => (
              <span key={t.tag.id} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                {t.tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <section className="rounded-lg border p-4">
        <h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-wide mb-3">Identity</h3>
        <dl className="grid gap-2 text-sm">
          <div><dt className="text-muted-foreground">Gender</dt><dd>{person.gender}</dd></div>
          {person.birthDate && <div><dt className="text-muted-foreground">Birth date</dt><dd>{formatDate(person.birthDate)}</dd></div>}
          {person.deathDate && <div><dt className="text-muted-foreground">Death date</dt><dd>{formatDate(person.deathDate)}</dd></div>}
          {age != null && <div><dt className="text-muted-foreground">Age</dt><dd>{age} years</dd></div>}
        </dl>
      </section>

      <section className="rounded-lg border p-4">
        <h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-wide mb-3">Contact</h3>
        {person.phones.length === 0 && person.emails.length === 0 ? (
          <p className="text-sm text-muted-foreground">No contact info.</p>
        ) : (
          <dl className="space-y-2 text-sm">
            {person.phones.map((p) => (
              <div key={p.id}>
                <dt className="text-muted-foreground">{p.label || "Phone"}</dt>
                <dd><a href={`tel:${p.number}`} className="underline">{p.number}</a></dd>
              </div>
            ))}
            {person.emails.map((e) => (
              <div key={e.id}>
                <dt className="text-muted-foreground">{e.label || "Email"}</dt>
                <dd><a href={`mailto:${e.email}`} className="underline">{e.email}</a></dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className="rounded-lg border p-4">
        <h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-wide mb-3">Location</h3>
        {(person.country || person.city || person.address) ? (
          <dl className="grid gap-2 text-sm">
            {person.country && <div><dt className="text-muted-foreground">Country</dt><dd>{person.country}</dd></div>}
            {person.city && <div><dt className="text-muted-foreground">City</dt><dd>{person.city}</dd></div>}
            {person.address && <div><dt className="text-muted-foreground">Address</dt><dd>{person.address}</dd></div>}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">No location.</p>
        )}
      </section>

      <section className="rounded-lg border p-4">
        <h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-wide mb-3">Work</h3>
        {(person.occupation || person.workplace) ? (
          <dl className="grid gap-2 text-sm">
            {person.occupation && <div><dt className="text-muted-foreground">Occupation</dt><dd>{person.occupation}</dd></div>}
            {person.workplace && <div><dt className="text-muted-foreground">Workplace</dt><dd>{person.workplace}</dd></div>}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">No work info.</p>
        )}
      </section>

      <section className="rounded-lg border p-4">
        <h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-wide mb-3">Status</h3>
        <p className="text-sm">Marital status: {person.maritalStatus}</p>
      </section>

      {(parents.length > 0 || spouse || children.length > 0 || siblings.length > 0 || other.length > 0) && (
        <section className="rounded-lg border p-4">
          <h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-wide mb-3">Relationships</h3>
          <div className="space-y-3 text-sm">
            {parents.length > 0 && (
              <div>
                <dt className="text-muted-foreground font-medium mb-1">Parents</dt>
                <dd className="flex flex-wrap gap-2">
                  {parents.map((p) => (
                    <Link key={p.id} href={`/people/${p.id}`} className="underline">{p.firstName} {p.lastName}</Link>
                  ))}
                </dd>
              </div>
            )}
            {spouse && (
              <div>
                <dt className="text-muted-foreground font-medium mb-1">Spouse</dt>
                <dd><Link href={`/people/${spouse.id}`} className="underline">{spouse.firstName} {spouse.lastName}</Link></dd>
              </div>
            )}
            {children.length > 0 && (
              <div>
                <dt className="text-muted-foreground font-medium mb-1">Children</dt>
                <dd className="flex flex-wrap gap-2">
                  {children.map((p) => (
                    <Link key={p.id} href={`/people/${p.id}`} className="underline">{p.firstName} {p.lastName}</Link>
                  ))}
                </dd>
              </div>
            )}
            {siblings.length > 0 && (
              <div>
                <dt className="text-muted-foreground font-medium mb-1">Siblings</dt>
                <dd className="flex flex-wrap gap-2">
                  {siblings.map((p) => (
                    <Link key={p.id} href={`/people/${p.id}`} className="underline">{p.firstName} {p.lastName}</Link>
                  ))}
                </dd>
              </div>
            )}
            {other.length > 0 && (
              <div>
                <dt className="text-muted-foreground font-medium mb-1">Other</dt>
                <dd className="flex flex-wrap gap-2">
                  {other.map(({ person: p, label }) => (
                    <Link key={p.id} href={`/people/${p.id}`} className="underline">
                      {p.firstName} {p.lastName}{label ? ` (${label})` : ""}
                    </Link>
                  ))}
                </dd>
              </div>
            )}
          </div>
        </section>
      )}

      {person.notes && (
        <section className="rounded-lg border p-4">
          <h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-wide mb-3">Notes</h3>
          <p className="text-sm whitespace-pre-wrap">{person.notes}</p>
        </section>
      )}
    </div>
  );
}
