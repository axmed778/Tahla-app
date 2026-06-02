npm# Tahla App – Pre-deploy checklist

Use this list to verify all functions before deploying.

---

## 1. Authentication & access

- [ ] **Lock page** (`/lock`) – Login with email + password; link to register
- [ ] **Register** (`/register`) – New user sign-up (email, firstName, lastName, password, optional birthDate); first user becomes master
- [ ] **Logout** – Clears session and redirects to `/lock`
- [ ] **Session protection** – Unauthenticated users are redirected to `/lock` (except `/lock` and `/register`)
- [ ] **JWT session** – Cookie signed with `TAHLA_COOKIE_SECRET`; invalid/expired token sends user to lock

---

## 2. Profile & onboarding

- [ ] **Profile complete** (`/profile/complete`) – New user without a linked Person is redirected here after login
- [ ] **Complete profile** – Create a Person linked to current user (prefilled from user name); redirect to home when done
- [ ] **Settings → My profile** – Link to edit own person (`/people/[id]/edit`) or to complete profile if not linked

---

## 3. People (directory & profiles)

- [ ] **Home / directory** (`/`) – List people with search, filters (city, marital status, gender), sort (name / updated), pagination
- [ ] **Search** – By name, city, workplace, notes, phone numbers, emails, tags
- [ ] **Person detail** (`/people/[id]`) – View one person (name, photo, dates, location, contacts, relationships, tags)
- [ ] **Add person (quick)** (`/people/new`) – Minimal add then optionally “Add full profile”
- [ ] **Add person (full)** (`/people/new/full`) – Full form with country/city selector, phones, emails, tags
- [ ] **Edit person** (`/people/[id]/edit`) – Update all person fields; country/city selectors
- [ ] **Delete person** – Remove person (and related data)
- [ ] **Person photo** – Upload / remove profile photo (validated image type & size)
- [ ] **Country & city selectors** – Predefined countries and cities (e.g. Azerbaijan, Germany, Russia, Turkey, etc.)

---

## 4. Relationships

- [ ] **Add relationship** – Link two people with type (e.g. parent/child, spouse) and optional label
- [ ] **Remove relationship** – Delete a relationship between two people

---

## 5. Family tree

- [ ] **Tree entry** (`/tree`) – Redirects to default tree person (if set in settings) or current user’s person, or home
- [ ] **Tree view** (`/tree/[personId]`) – View tree rooted at that person
- [ ] **Tree overview** (`/tree/overview`) – Overview of tree structure

---

## 6. Friends

- [ ] **Friends list** (`/friends`) – See friends, sent requests, incoming requests
- [ ] **Send friend request** – To a user who is not already a friend
- [ ] **Accept friend request** – Incoming request → add as friend
- [ ] **Decline friend request** – Reject incoming request
- [ ] **Cancel friend request** – Cancel own sent request
- [ ] **Remove friend** – Unfriend

---

## 7. Events

- [ ] **Events list** (`/events`) – Events I created or I’m invited to; sorted by date
- [ ] **Create event** (`/events/new`) – Name, date, place, optional photo, invitation list (invitees)
- [ ] **Invitees** – Select other users as participants; list visible only to creator and invited users
- [ ] **Event detail** (`/events/[id]`) – View event (creator + participants if allowed)
- [ ] **Participant list visibility** – Only creator and participants can see the invitee list

---

## 8. Feed

- [ ] **Feed** (`/feed`) – Posts (optionally filter by group)
- [ ] **Create post** – New post (with optional images?)
- [ ] **Comments** – Add comment on a post

---

## 9. Groups

- [ ] **Groups list** (`/groups`) – Groups I’m in
- [ ] **Create group** (`/groups/new`) – New group
- [ ] **Group detail** (`/groups/[id]`) – View group, members, feed for group
- [ ] **Join group** – Join a group (if open?) or request to join
- [ ] **Leave group** – Leave a group
- [ ] **Group visibility** – Set visibility (e.g. who can see / join)
- [ ] **Apply to join** – Request to join (closed) group
- [ ] **Approve / reject application** – Admin approves or rejects join requests
- [ ] **Available groups** – List groups user can discover or join

---

## 10. Messages

- [ ] **Conversations** (`/messages`) – List of conversations (with friends/other users)
- [ ] **Conversation** (`/messages/[id]`) – Thread with one other user
- [ ] **Send message** – Send message in conversation
- [ ] **Get or create conversation** – Starting a chat creates conversation if needed

---

## 11. Settings (per user)

- [ ] **Settings** (`/settings`) – Only when logged in
- [ ] **Change password** – User changes own password (current + new)
- [ ] **Export data** – Export people, tags, relationships as JSON (from settings)
- [ ] **Import data** – Master only; replace or merge (people, tags, relationships)

---

## 12. Master-only (app owner)

- [ ] **Add user** – Master creates new user (email, firstName, lastName, password)
- [ ] **Delete user** – Master can delete any user except self; user can delete own account
- [ ] **Set user password** – Master sets another user’s password (no current password)
- [ ] **Default tree person** – Master sets which person is the default root for `/tree`
- [ ] **Reset app data** – Master only; wipes events, groups, posts, friendships, people, relationships, tags, users; redirects to lock
- [ ] **Import data** – Only master can run import

---

## 13. Locale / i18n

- [ ] **Language switcher** – Change app language (e.g. on lock page)
- [ ] **Set locale** – Persist chosen locale (e.g. via form action)
- [ ] **Translations** – All main UI strings use `t(...)` / translations

---

## 14. Environment & security

- [ ] **`TAHLA_COOKIE_SECRET`** – Set in production; used for signing session cookie
- [ ] **`DATABASE_URL`** – Points to production DB (e.g. SQLite file or hosted DB)
- [ ] **Secure cookie** – Session cookie `secure` flag in production (`NODE_ENV === "production"`)
- [ ] **No secrets in client** – No API keys or secrets in client bundles

---

## 15. Data & DB

- [ ] **Migrations** – All migrations applied (`npx prisma migrate deploy`) for the deploy environment
- [ ] **Prisma client** – Generated for same schema as DB (`npx prisma generate` after any schema change)
- [ ] **File uploads** – If using local disk, `public/uploads` (events, posts, person photos) exist and are writable; consider cloud storage for production

---

## Quick command checks before deploy

```bash
# Install deps
npm ci

# Generate Prisma client (stop dev server first if it’s running)
npx prisma generate

# Run migrations against deploy DB (set DATABASE_URL first)
npx prisma migrate deploy

# Build
npm run build
```

---

## Automated pre-deploy test

Run a full reset, seed, and build (catches schema/type/build issues):

```bash
npm run test:predeploy
```

This script: (1) Resets the database and syncs to the current Prisma schema (`prisma db push --force-reset`). (2) Wipes all data and seeds test users and sample data. (3) Runs `npm run build`.

**Test accounts after run** (password for all: `test123`): **master@test.com** (master), **alice@test.com** (friend of master), **bob@test.com** (sent friend request to master). Use these to manually verify login, directory, friends, events, groups, feed, messages, notifications, tree, settings.

**Family tree (pro max):** The seed creates **40 people** in a 4-generation ancestor pyramid (8 great-grandparents → 4 grandparents → 2 parents → 1 main user). The **main user** (the person from whom the tree is viewed, at the bottom of the pyramid) is **Master User** — the profile linked to **master@test.com**. Log in as master, open **Family tree**, and you see the 8→4→2→1 layout.

---

*Update this checklist when you add or remove features.*
