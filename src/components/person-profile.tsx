import Link from "next/link";
import type { Person, PersonPhone, PersonEmail, PersonTag, Tag, Relationship } from "@prisma/client";

type PersonWithRelations = Person & {
  phones: PersonPhone[];
  emails: PersonEmail[];
  tags: (PersonTag & { tag: Tag })[];
  relationshipsFrom: (Relationship & { toPerson: Person })[];
  relationshipsTo: (Relationship & { fromPerson: Person })[];
};

type TranslateFn = (key: string) => string;

type Props = {
  person: PersonWithRelations;
  age: number | null;
  formatDate: (d: Date | null) => string;
  parents: Person[];
  children: Person[];
  siblings: Person[];
  spouse: Person | null;
  other: { person: Person; label: string | null }[];
  t: TranslateFn;
};

const personName = (p: Person) => `${p.firstName} ${p.middleName ? `${p.middleName} ` : ""}${p.lastName}`;

export function PersonProfile({ person, age, formatDate, parents, children, siblings, spouse, other, t }: Props) {
  const currentName = personName(person);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">
          {person.firstName} {person.middleName && `${person.middleName} `}{person.lastName}
        </h2>
        {person.tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {person.tags.map((tag) => (
              <span key={tag.tag.id} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                {tag.tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <section className="rounded-lg border p-4">
        <h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-wide mb-3">{t("profile.identity")}</h3>
        <dl className="grid gap-2 text-sm">
          <div><dt className="text-muted-foreground">{t("profile.gender")}</dt><dd>{person.gender}</dd></div>
          {person.birthDate && <div><dt className="text-muted-foreground">{t("profile.birthDate")}</dt><dd>{formatDate(person.birthDate)}</dd></div>}
          {person.deathDate && <div><dt className="text-muted-foreground">{t("profile.deathDate")}</dt><dd>{formatDate(person.deathDate)}</dd></div>}
          {age != null && <div><dt className="text-muted-foreground">{t("profile.age")}</dt><dd>{age} {t("profile.years")}</dd></div>}
        </dl>
      </section>

      <section className="rounded-lg border p-4">
        <h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-wide mb-3">{t("profile.contact")}</h3>
        {person.phones.length === 0 && person.emails.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("profile.noContactInfo")}</p>
        ) : (
          <dl className="space-y-2 text-sm">
            {person.phones.map((p) => (
              <div key={p.id}>
                <dt className="text-muted-foreground">{p.label || t("profile.phone")}</dt>
                <dd><a href={`tel:${p.number}`} className="underline">{p.number}</a></dd>
              </div>
            ))}
            {person.emails.map((e) => (
              <div key={e.id}>
                <dt className="text-muted-foreground">{e.label || t("profile.email")}</dt>
                <dd><a href={`mailto:${e.email}`} className="underline">{e.email}</a></dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className="rounded-lg border p-4">
        <h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-wide mb-3">{t("profile.location")}</h3>
        {(person.country || person.city || person.address) ? (
          <dl className="grid gap-2 text-sm">
            {person.country && <div><dt className="text-muted-foreground">{t("profile.country")}</dt><dd>{person.country}</dd></div>}
            {person.city && <div><dt className="text-muted-foreground">{t("profile.city")}</dt><dd>{person.city}</dd></div>}
            {person.address && <div><dt className="text-muted-foreground">{t("profile.address")}</dt><dd>{person.address}</dd></div>}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">{t("profile.noLocation")}</p>
        )}
      </section>

      <section className="rounded-lg border p-4">
        <h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-wide mb-3">{t("profile.work")}</h3>
        {(person.occupation || person.workplace) ? (
          <dl className="grid gap-2 text-sm">
            {person.occupation && <div><dt className="text-muted-foreground">{t("profile.occupation")}</dt><dd>{person.occupation}</dd></div>}
            {person.workplace && <div><dt className="text-muted-foreground">{t("profile.workplace")}</dt><dd>{person.workplace}</dd></div>}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">{t("profile.noWorkInfo")}</p>
        )}
      </section>

      <section className="rounded-lg border p-4">
        <h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-wide mb-3">{t("profile.status")}</h3>
        <p className="text-sm">{t("profile.maritalStatus")}: {person.maritalStatus}</p>
      </section>

      {(parents.length > 0 || spouse || children.length > 0 || siblings.length > 0 || other.length > 0) && (
        <section className="rounded-lg border p-4">
          <h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-wide mb-3">{t("profile.relationships")}</h3>
          <div className="space-y-3 text-sm">
            {parents.length > 0 && (
              <div>
                <dt className="text-muted-foreground font-medium mb-1">{t("profile.parents")}</dt>
                <dd className="flex flex-wrap gap-x-2 gap-y-1">
                  {parents.map((p) => (
                    <span key={p.id}>
                      <Link href={`/people/${p.id}`} className="underline">{personName(p)}</Link>
                      <span className="text-muted-foreground"> — {t("profile.parentOf")} {currentName}</span>
                    </span>
                  ))}
                </dd>
              </div>
            )}
            {spouse && (
              <div>
                <dt className="text-muted-foreground font-medium mb-1">{t("profile.spouse")}</dt>
                <dd><Link href={`/people/${spouse.id}`} className="underline">{personName(spouse)}</Link></dd>
              </div>
            )}
            {children.length > 0 && (
              <div>
                <dt className="text-muted-foreground font-medium mb-1">{t("profile.children")}</dt>
                <dd className="flex flex-wrap gap-x-2 gap-y-1">
                  {children.map((p) => (
                    <span key={p.id}>
                      <Link href={`/people/${p.id}`} className="underline">{personName(p)}</Link>
                      <span className="text-muted-foreground"> — {t("profile.childOf")} {currentName}</span>
                    </span>
                  ))}
                </dd>
              </div>
            )}
            {siblings.length > 0 && (
              <div>
                <dt className="text-muted-foreground font-medium mb-1">{t("profile.siblings")}</dt>
                <dd className="flex flex-wrap gap-2">
                  {siblings.map((p) => (
                    <Link key={p.id} href={`/people/${p.id}`} className="underline">{personName(p)}</Link>
                  ))}
                </dd>
              </div>
            )}
            {other.length > 0 && (
              <div>
                <dt className="text-muted-foreground font-medium mb-1">{t("profile.other")}</dt>
                <dd className="flex flex-wrap gap-2">
                  {other.map(({ person: p, label }) => (
                    <Link key={p.id} href={`/people/${p.id}`} className="underline">
                      {personName(p)}{label ? ` (${label})` : ""}
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
          <h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-wide mb-3">{t("profile.notes")}</h3>
          <p className="text-sm whitespace-pre-wrap">{person.notes}</p>
        </section>
      )}
    </div>
  );
}
