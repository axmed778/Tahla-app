# Təhlə App

A fast, offline-by-default family and relatives directory. Store details (location, age, occupation, workplace, marital status, etc.) with relationships, search, filters, and import/export.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **TailwindCSS** + shadcn/ui
- **Prisma ORM** + SQLite (local DB)
- **Zod** for validation
- **bcryptjs** for PIN hashing
- No external services

## Setup

1. **Clone and install**

   ```bash
   cd tahla-app
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env` and set:

   - `DATABASE_URL="file:./dev.db"` (default for SQLite)
   - `TAHLA_COOKIE_SECRET` — **required**; a long random string (at least 32 characters) for signing session cookies. The app will not start without it.

3. **Database**

   ```bash
   npm run db:generate
   npm run db:push
   # or: npm run db:migrate
   npm run db:seed
   ```

4. **Reset database and create master account**

   To clear all data and get a fresh DB with only the seed master user:

   ```bash
   npx prisma migrate reset --force
   ```

   This will:
   - Drop the database
   - Re-run all migrations
   - Run the seed script


   (You can also reset from the app: log in as master → Settings → “Reset app data”. Then register again; the first registered user becomes master.)

5. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Sign in with email and password at `/lock`. After seed, use `master@example.com` / `master123`.

## How the PIN works

- **First run:** No PIN is set. You are redirected to `/lock` and must set a 4–8 digit PIN. The PIN is hashed with bcrypt and stored in the `Settings` table (single row, `id = 1`).
- **Later runs:** If a PIN is set and you are not unlocked, you are redirected to `/lock` and must enter the PIN. On success, a signed HttpOnly cookie (`tahla_unlocked`) is set with a short TTL (e.g. 12 hours). Middleware checks this cookie and redirects to `/lock` when missing or invalid.
- **Change PIN:** In Settings you can change the PIN; the current PIN is required.
- **Forgot PIN (MVP):** On the lock screen, “Forgot PIN?” opens a dialog. The only option is “Reset app data,” which clears all app data (people, tags, relationships) and removes the PIN. Use only if you cannot recover the PIN.

## Routes

| Route | Description |
|-------|-------------|
| `/lock` | Set PIN (first run) or unlock with PIN |
| `/` | Directory: searchable, filterable, sortable list of people |
| `/people/new` | Quick add (name, phone, optional city) |
| `/people/new/full` | Full add form |
| `/people/[id]` | Person profile and mini tree view |
| `/people/[id]/edit` | Edit person |
| `/settings` | Change PIN, export/import, (reset via lock page) |

## Export / Import

- **Export:** Settings → “Export all data (JSON)” downloads a JSON file.
- **Import:** Settings → choose a JSON file and either **Replace all** (clear DB then import) or **Merge** (match by `id`, update existing, add new).
- Schema is validated with Zod. See `/docs/export-format.json` for an example shape.

## Scripts

- `npm run dev` — start dev server
- `npm run build` / `npm run start` — production
- `npm run db:generate` — generate Prisma client
- `npm run db:push` — push schema to DB (no migration file)
- `npm run db:migrate` — run migrations
- `npm run db:seed` — seed sample data
- `npm run db:reset` — reset DB (migrate reset)

## Data model (summary)

- **Settings** — `id = 1`, `pinHash`, timestamps
- **Person** — names, gender, birth/death, location, work, marital status, notes
- **PersonPhone** / **PersonEmail** — multiple per person, optional label
- **Tag** — unique name; **PersonTag** links people to tags
- **Relationship** — `fromPersonId`, `toPersonId`, `type` (PARENT, CHILD, SIBLING, SPOUSE, OTHER), optional `label`. Stored in one direction; inverse (e.g. PARENT ↔ CHILD, SPOUSE ↔ SPOUSE) is created automatically.

All code and UI are in English.
