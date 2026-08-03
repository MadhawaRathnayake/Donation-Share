# Member 3 — Handbook and Worklog

**Owner:** Member 3 — Backend Core, Domain 1
**Scope:** Epic 3.1 (User Profile API) and Epic 3.2 (Donation module)
**Branch:** `feature/member3-profile-and-donation-api`

This document is written so that someone who has never seen the project can read
it top to bottom and understand what this part of FoodShare does, how it works,
why each decision was made, and what a user can actually do because of it.

Sections 1–8 are the handbook. Section 9 onward is the running log — append new
sessions to the bottom as work continues.

---

## Table of contents

1. [What this part of the system is responsible for](#1-what-this-part-of-the-system-is-responsible-for)
2. [Background you need before the code makes sense](#2-background-you-need-before-the-code-makes-sense)
3. [How a request travels through the code](#3-how-a-request-travels-through-the-code)
4. [Every file, what is in it, and why it exists](#4-every-file-what-is-in-it-and-why-it-exists)
5. [The two features, end to end](#5-the-two-features-end-to-end)
6. [Decisions, and the reasoning behind each](#6-decisions-and-the-reasoning-behind-each)
7. [Problems found in the existing code](#7-problems-found-in-the-existing-code)
8. [Proof that it works](#8-proof-that-it-works)
9. [Session log](#9-session-log)

---

## 1. What this part of the system is responsible for

FoodShare moves surplus food from a business that has too much of it to a
charity that needs it. Five people build the backend, split so that nobody edits
the same files.

This part owns **the beginning of the food's journey**: the accounts, and the
donations themselves.

Concretely, two responsibilities.

### Responsibility 1 — Profiles

When a user signs up, Keycloak (the identity system) tells us only that a person
exists and gives us their identifier. It does not tell us that they are a
restaurant called Harbour Kitchen at Harbour Market, Colombo, reachable on
+94 11 234 5678, open Monday to Friday.

All of that is *our* information about *our* users, and it belongs in *our*
database. Capturing and serving it is this part's job. It answers the question
**"who is this user, and what kind of participant are they?"**

### Responsibility 2 — Donations

A donor posts surplus food: what it is, how much, where to collect it, when it
stops being safe to eat, and optionally a photo. Creating those records, showing
a donor their own history, and letting them withdraw something nobody has
claimed yet — that is this part's job too.

### Where the responsibility stops

| Question | Owner |
|---|---|
| Who is this user? What can they post? | **This part (Member 3)** |
| Which donations exist, and their details | **This part (Member 3)** |
| Searching and filtering donations | Member 4 |
| Claiming a donation | Member 4 |
| Assigning a volunteer, tracking delivery | Member 5 |
| Sending emails and in-app messages | Member 5 |
| Approving users, platform statistics | Member 1 |
| Every screen the user sees | Member 2 |

The handover is deliberate. Once a donation exists and is visible, this part's
work is done and Member 4 takes over.

---

## 2. Background you need before the code makes sense

Three ideas explain most of the design. Without them the code looks arbitrary.

### 2.1 Keycloak holds identity; our database holds everything else

FoodShare does not store passwords. It never sees them. Keycloak — running in
its own container — handles registration, login and password rules. This is the
decision recorded as ADR-005 in the architecture report, and the reason is that
storing passwords safely is a solved problem that is easy to get dangerously
wrong, so we use a mature system instead of writing our own.

When a user logs in, Keycloak gives the browser a **token**: a signed statement
saying "this is user `abc-123`, and they hold the role Donor". The browser
attaches that token to every request.

So there are two identities for the same human being:

| | Where it lives | Looks like | What it is |
|---|---|---|---|
| Keycloak subject (`sub`) | Keycloak | `11111111-1111-...` | Identity-system identifier |
| `User.id` | Our PostgreSQL | `48969655-24fb-...` | Our own database row identifier |

**They are different values and are never equal.** The link between them is the
`User.keycloakId` column, which stores the Keycloak `sub`. To find out who is
making a request: take the `sub` from the token, look up the row whose
`keycloakId` matches, and that row is the user.

Getting this wrong is not a small bug — it means no lookup ever succeeds. It was
wrong in the starting code (see section 7.2).

### 2.2 A token must be verified, not just read

A token is three parts: a header, the claims, and a signature. The claims are
plain readable text — anyone can see them, and anyone can *write* them. What
makes a token trustworthy is the signature, created with a private key only
Keycloak holds.

Reading a token without checking the signature is like accepting a letter that
says "I am the bank manager" without checking whether it came from the bank.
Anyone can write that sentence.

So the API fetches Keycloak's public key and verifies the signature on every
request. If it does not match, the request is rejected — no matter how
convincing the claims look.

### 2.3 Notifications happen separately from the action

When a donation is posted, several people should be told. Sending emails takes
seconds and can fail. If posting a donation waited for the emails, the donor
would stare at a spinner, and a mail server outage would stop people donating
food entirely.

Instead the donation is saved, and then a short **event** message is dropped
onto a queue (RabbitMQ). The donor gets their answer immediately. Member 5's
worker picks the message up whenever it is ready and does the slow work.

This is ADR-002 in the report, and it satisfies FR12. The important consequence
is written into the code: **publishing an event must never be able to fail the
request that caused it.** If the queue is unreachable, the donation is still
saved and the API still answers normally.

---

## 3. How a request travels through the code

Every request climbs the same ladder. Each rung answers one question, and any
rung can stop the request and reply.

```
     Browser sends a request
              │
              ▼
   ┌──────────────────────┐
   │ routes.ts            │  Which URL is this, and what runs, in what order?
   └──────────────────────┘
              │
              ▼
   ┌──────────────────────┐
   │ auth.middleware.ts   │  Is this token genuine?          → no: 401
   └──────────────────────┘
              │
              ▼
   ┌──────────────────────┐
   │ user.middleware.ts   │  Which FoodShare account is it?  → none: 404
   └──────────────────────┘
              │
              ▼
   ┌──────────────────────┐
   │ auth.middleware.ts   │  Are they allowed to do this?    → no: 403
   │ (requireRole)        │
   └──────────────────────┘
              │
              ▼
   ┌──────────────────────┐
   │ schema.ts            │  Does the data make sense?       → no: 400
   └──────────────────────┘
              │
              ▼
   ┌──────────────────────┐
   │ service.ts           │  Do the real work: database, events
   └──────────────────────┘
              │
              ▼
   ┌──────────────────────┐
   │ mapper.ts            │  Shape the reply for the frontend
   └──────────────────────┘
              │
              ▼
        Response returns

   At any rung, a failure is thrown and errors.ts turns it into
   { code, message, fieldErrors? } — one consistent format everywhere.
```

### Why this is split into so many small files

The starting code did all of this inside one controller function. That works
until something breaks, and then you cannot tell which of the five jobs broke.
It also means the validation rules cannot be tested without a running database.

With one job per file, 22 of the 29 automated tests run in milliseconds because
they test pure rules with no database at all.

---

## 4. Every file, what is in it, and why it exists

### 4.1 Shared foundations — `src/lib/`

These are not this part's feature. They are plumbing the whole team imports, so
that four people's endpoints behave consistently.

| File | Lines | What is inside | Why it exists |
|---|---|---|---|
| `env.ts` | 94 | Every setting read from the environment once, with defaults and correct types | Without it, `process.env.SOMETHING` appears in twenty files, each with its own typo risk and its own fallback. One file means one place to look and one place to change. |
| `errors.ts` | 84 | `AppError`, helpers (`notFound`, `forbidden`, `conflict`), and the handler that formats every failure | Member 2's frontend reads `{ code, message, fieldErrors }`. Every error in the API must look like that or the UI cannot display it. Formatting once means it cannot drift. |
| `pagination.ts` | 39 | Reads `?page=` and `?pageSize=`, clamps them, and builds `{ items, page, pageSize, total }` | Long lists must arrive in pages. Members 3, 4 and 5 all return lists, and they must all look identical to the UI. Also stops a request asking for a million rows. |
| `events.ts` | 61 | The list of event names and the message envelope shape | The publisher (here) and the consumer (Member 5) must agree on spelling exactly. One shared file makes disagreement impossible. |
| `rabbitmq.ts` | 106 | Connects to the broker, publishes durably, reconnects, never throws | Implements ADR-002. The "never throws" part is the important bit — see 2.3. |
| `upload.ts` | 88 | Multer configuration, file-type and size checks, URL building, cleanup | Accepting files from the internet is where things go wrong: wrong types, huge files, malicious filenames. All three are handled here. |
| `geocode.ts` | 93 | Turns an address into latitude and longitude | Task 3.1.2. Member 4 needs coordinates for distance search. Pluggable provider, and returns nothing rather than failing if the service is slow. |
| `keycloakAdmin.ts` | 110 | Tells Keycloak which role a user chose during onboarding | Explained fully in 6.3. |
| `prisma.ts` | 11 | The database connection (was already there) | — |

### 4.2 Middleware — `src/middleware/`

Middleware runs *before* the endpoint, and can stop the request.

**`auth.middleware.ts` (137 lines)** contains two things.

`authenticate` takes the token from the `Authorization` header, fetches
Keycloak's public key, verifies the signature, checks the issuer and the expiry,
and attaches the user's identity to the request. Failure means 401.

`requireRole('Donor')` checks the user holds the required role. It accepts the
role from *either* the Keycloak token *or* the account record — the reason is in
6.3.

**`user.middleware.ts` (50 lines)** turns the Keycloak `sub` into a FoodShare
account row, using the `keycloakId` link from 2.1. Not having an account is not
treated as an error here: a user who has logged in but not completed onboarding
simply has no account yet, which is what makes the onboarding redirect work.

### 4.3 The profile module — `src/modules/user/`

| File | Lines | Contents |
|---|---|---|
| `user.routes.ts` | 22 | Three endpoints and the middleware order for each |
| `user.schema.ts` | 65 | Validation rules per role, with the same messages the browser shows |
| `user.service.ts` | 217 | The real work: create account and profile together, update, approval policy, geocoding, role sync |
| `user.mapper.ts` | 85 | Turns database rows into the exact `Profile` shape the frontend declares |
| `user.controller.ts` | 26 | Thin glue between HTTP and the service |

### 4.4 The donation module — `src/modules/donation/`

| File | Lines | Contents |
|---|---|---|
| `donation.routes.ts` | 36 | Four endpoints, with the upload step wired into the create route |
| `donation.schema.ts` | 42 | Quantity positive and whole, expiry in the future, expiry after pickup |
| `donation.service.ts` | 177 | Create, donor history, cancel, public list, and event publishing |
| `donation.mapper.ts` | 31 | Flattens the donor into `donorName`, converts dates to ISO strings |
| `donation.controller.ts` | 46 | Thin glue, plus deleting an uploaded file if the request is rejected |

### 4.5 Supporting files

| File | Purpose |
|---|---|
| `src/types/auth.ts` | Describes the two identity shapes so TypeScript checks them |
| `src/index.ts` | Starts the server, mounts both modules, serves uploaded images, shuts down cleanly |
| `prisma/schema.prisma` | The database structure |
| `.env.example` | Every setting documented, so nobody has to read `env.ts` to configure the project |
| `vitest.config.ts` | Test runner configuration |
| `src/tests/*.test.ts` | 29 automated tests |

---

## 5. The two features, end to end

### 5.1 Onboarding — what a new user can now do

**Before this work:** a person could log in through Keycloak and then reach a
dead end. There was nowhere to record who they were, and the SPA had no
workspace to send them to.

**Now:** a new user logs in, chooses whether they are a Donor, a Recipient or a
Volunteer, fills in the matching form, and lands in their workspace.

Step by step, what happens on `POST /api/users/profile`:

1. **Token is verified.** Not just read — the signature is checked against
   Keycloak's public key.
2. **Existing account is checked.** If a profile already exists, the request
   stops with `409 PROFILE_EXISTS`. Sending the form twice cannot create two
   profiles.
3. **The submitted data is validated** against rules that depend on the chosen
   role. A Volunteer must give a name and availability; an organisation must
   give an organisation name, contact person, tax ID and operating hours. Any
   problem returns a map of field name to message, which the UI shows beside the
   offending input.
4. **The address is geocoded** into coordinates, if a provider is configured.
   If the lookup fails or times out, it is skipped — a profile save must not
   fail because a mapping service was slow.
5. **The account and profile are written together** in a single transaction.
   Either both exist afterwards, or neither does. A half-created user cannot be
   displayed by the UI, so it must not be possible to create one.
6. **The approval status is set** by policy: Recipients wait for administrator
   approval, Donors and Volunteers do not. Configurable — see 6.2.
7. **The role is sent to Keycloak** so the SPA will show the right workspace.
   Best effort — see 6.3.
8. **The profile is returned** in exactly the shape the frontend's type
   definitions declare.

The other two endpoints: `GET /api/users/profile/me` returns the caller's own
profile, or `404` if onboarding has not been completed — and that 404 is what
the frontend uses to decide to show the onboarding screen. `PUT
/api/users/profile/me` updates the details, but refuses to change the role,
because the role decides which table holds the profile and which workspace the
UI shows. Changing it is an administrative action, not a self-service edit.

### 5.2 Posting and managing a donation

**Before this work:** posting a donation was impossible. The lookup that finds
the donor could never match a row (7.2), so every attempt would have failed.

**Now:** a donor fills in a form, optionally attaches a photo, and the donation
appears in their history and in the public feed. They can cancel it while
nobody has claimed it.

What happens on `POST /api/donations`:

1. **Token verified**, then **role checked** — only a Donor may post.
2. **The photo is received**, if there is one. Only JPEG, PNG and WebP are
   accepted, at most 5 MB. The uploaded file is given a new random name, because
   a filename chosen by the sender is not safe to trust.
3. **The details are validated.** Quantity must be a positive whole number. The
   expiry must be in the future — listing food that is already unsafe is the one
   thing this system must never do. The expiry must come after the pickup time.
   *The pickup time is allowed to be slightly in the past*, deliberately: a
   donor posting food that is ready right now is normal, and browser and server
   clocks are never exactly aligned.
4. **If validation failed and a photo was already saved, the photo is deleted.**
   Files are written to disk before validation runs, so without this step every
   rejected form would leave an abandoned image on the server forever.
5. **The donation row is created** and linked to the donor's profile.
6. **A `DonationPosted` event is published** so Member 5's worker can notify
   people. Best effort, as always.

`GET /api/donations/me` returns that donor's own donations, newest first, in
pages. `PUT /api/donations/:id/cancel` withdraws one — and how it does that is
worth understanding, in 6.4.

---

## 6. Decisions, and the reasoning behind each

Each of these had more than one defensible answer. The reasoning is recorded so
the choice can be argued for, or reversed on purpose rather than by accident.

### 6.1 New database columns are optional in the database, required in the API

The onboarding form sends `phone`, `taxId` and `operatingHours`, and the whole
concept of a Volunteer profile. None existed in the database.

Adding them as *required* columns would break `prisma db push` for every
teammate who already has data, forcing a coordinated database reset across five
machines. Adding them as *optional* columns, with the requirement enforced by
validation at the API, gives exactly the same guarantee for all new data and
disrupts nobody.

**Consequence:** the database will accept a row without a tax ID, but the API
never creates one.

### 6.2 The approval policy is configurable, because the requirements conflict

FR2 in the report says administrators approve donor *and* recipient
registrations. Member 2's UI was built against a rule where donors are approved
immediately and only recipients wait. These genuinely disagree.

The default follows the UI, so that the frontend behaves identically whether it
is running against mock data or the real API — which makes testing meaningful.
Setting `REQUIRE_DONOR_APPROVAL=true` switches to the strict FR2 reading with no
code change.

**This is an open item for the group** — see section 8.4.

### 6.3 Role assignment happens on the server, and fails softly

The SPA decides which workspace to show by reading the roles inside the Keycloak
token. So a user who picks "Donor" during onboarding will never see the donor
workspace unless that role reaches Keycloak.

The browser cannot do this: it would mean shipping administrative credentials
into a web page where anyone can read them. So the server does it, using
credentials that never leave the server.

But Keycloak might be unreachable. Rather than failing onboarding, the sync is
best effort, and `requireRole` therefore accepts the role from *either* the
token *or* the account record. This is why a user who has just onboarded can
immediately post a donation even though their existing token is older than their
role.

### 6.4 Cancelling is one conditional update, not read-then-write

The natural way to write cancellation is: read the donation, check it says
"Posted", then write "Cancelled".

The problem is what can happen *between* those two statements. Member 4's claim
transaction could claim the donation in that gap. The check passed, so the
cancel proceeds — and a donor has just withdrawn food that a charity was already
promised.

So the check and the write are a single statement, and the database evaluates
them together:

```ts
await prisma.foodDonation.updateMany({
  where: { id, donorId: donorProfile.id, status: DonationStatus.Posted },
  data:  { status: DonationStatus.Cancelled },
});
```

If nothing was updated, only *then* does the code investigate why, so the donor
gets an accurate message: not found, not yours, or already claimed.

This is the same reasoning as ADR-004 in the report, applied to cancellation
rather than claiming.

### 6.5 Coordinates are plain numbers, not PostGIS

The work breakdown allows either. PostGIS is a PostgreSQL extension that must be
installed into the database image; plain float columns work on the stock
`postgres:15` container the project already uses, and a bounding-box distance
filter works perfectly well on them.

### 6.6 The database keeps the report's names; the API translates

The report's class diagram calls a recipient's name `orgName`. The frontend
expects `organizationName`. Rather than renaming the column and making the code
disagree with the submitted report, the mapper translates at the boundary.

Same reasoning for approval status: three columns could disagree about whether a
user is approved, so the API always reports the account-level one. There is
exactly one answer to "is this user approved".

---

## 7. Problems found in the existing code

Three defects existed in the starting code. All three would have stopped the
project.

### 7.1 Tokens were read but never verified

```ts
const decoded = jwt.decode(token) as any;   // no signature check
```

`jwt.decode` reads a token's contents without checking the signature. Anyone
could have written their own token containing `"realm_access": {"roles":
["Admin"]}` and the API would have accepted it as an administrator.

The report already specified the correct behaviour in ADR-005 — tokens validated
against Keycloak's published signing keys — so the code contradicted the
architecture.

**Fixed.** Signatures are verified, and `src/tests/auth.test.ts` proves a token
signed with the wrong key is now rejected.

### 7.2 The donor lookup could never match

```ts
const donorProfile = await prisma.donorProfile.findUnique({
  where: { userId: user.id }        // user.id here was the Keycloak sub
});
```

As explained in 2.1, the Keycloak subject and `User.id` are different values.
This lookup would have returned nothing every time, and *every* attempt to post
a donation would have failed.

**Fixed.** Users are resolved by subject against `keycloakId`.

### 7.3 The database could not store the form's data

`phone`, `taxId`, `operatingHours` and volunteer details had no columns. The
onboarding form would have silently discarded most of what a user typed.

**Fixed.** Columns added, plus a `VolunteerProfile` model.

---

## 8. Proof that it works

### 8.1 Automated tests

```
npm test

 ✓ src/tests/validation.test.ts  (22 tests)
 ✓ src/tests/auth.test.ts        (7 tests)

 Test Files  2 passed (2)
      Tests  29 passed (29)
```

The authentication tests start a small local server pretending to be Keycloak,
so the real verification path runs. They check that a genuine token is accepted
and that four kinds of bad token are rejected: signed with the wrong key,
expired, from the wrong issuer, and unsigned. The wrong-key case is exactly what
would have passed under the old code.

**The tests caught a real bug during development.** Two failed with:

```
expected 'Invalid input: expected string, received undefined'
      to be 'Enter your full name.'
```

A field left out of the request entirely produced the validation library's
internal wording instead of a human message, so the UI would have shown
"Invalid input: expected string, received undefined" next to a form field. The
schema was fixed — not the test.

### 8.2 Every endpoint run against a real database

| Scenario | Result |
|---|---|
| No token | `401 UNAUTHENTICATED` |
| Valid token, not onboarded | `404 NOT_FOUND` (drives the onboarding redirect) |
| Invalid profile data | `400` with a message per field |
| Create donor / recipient / volunteer profile | `201`, correct approval status each time |
| Create profile twice | `409 PROFILE_EXISTS` |
| Update own profile | `200` |
| Try to change own role | `409 ROLE_IMMUTABLE` |
| Recipient tries to post a donation | `403 FORBIDDEN` |
| Donation with quantity 0 / already expired | `400` with per-field messages |
| Donation with photo | `201`, image served back over HTTP |
| Donor history, paginated | `{ items, page, pageSize, total }` |
| Another donor tries to cancel | `403 FORBIDDEN` |
| Owner cancels | `200`, status `Cancelled` |
| Cancel the same one again | `409 DONATION_NOT_CANCELLABLE` |
| Rejected upload leaves a file behind | No — cleaned up |
| Non-image upload | `400 UNSUPPORTED_MEDIA_TYPE` |

### 8.3 Events reaching the queue

Both event types arrived on `notification_queue`. This is what Member 5's worker
receives:

```json
{
  "eventType": "DonationPosted",
  "eventId": "7d6faa24-178e-405b-a76e-368121b0ab1a",
  "occurredAt": "2026-08-03T10:36:04.524Z",
  "message": "Harbour Kitchen posted 18 of Bakery items.",
  "payload": {
    "donationId": "31d9b381-...",
    "donorId": "7ea073c4-...",
    "donorUserId": "48969655-...",
    "donorName": "Harbour Kitchen",
    "foodType": "Bakery items",
    "quantity": 18,
    "pickupLocation": "Galle Road, Dehiwala",
    "pickupWindowStart": "2026-08-03T12:36:04.000Z",
    "expiryTime": "2026-08-03T19:36:04.000Z"
  }
}
```

`DonationCancelled` carries the same payload plus `"previousStatus": "Posted"`.

`eventId` is unique per publication, so if a message is delivered twice the
worker can recognise it and not send the same email twice. That is what makes
the "retry at least 3 times" requirement safe.

### 8.4 Still open

**Within this part:**
1. Geocoding is built but switched off by default. Turning it on needs a
   decision: a Google Maps key, or OpenStreetMap's free service with its rate
   limits.
2. The frontend has not yet been clicked through against the real API instead of
   its mock data (Task 3.2.3).
3. Uploaded images are stored on local disk. Fine for a demonstration; a
   deployment needs object storage.

**For the group to decide:**
4. `VolunteerProfile` is not in the report's class diagram (Section 4.4). The
   diagram needs updating, or a sentence explaining the addition.
5. FR2 versus the default approval policy (see 6.2).
6. Keycloak administrative credentials currently default to the development
   account. Member 1 must replace them before deployment.
7. The project uses `prisma db push`, which keeps no migration history. A
   baseline migration would let CI deploy schema changes safely.
8. **`docker-compose.yml` puts Keycloak and the application in the same
   `public` schema.** Report Section 4.3 states they use separate schemas; the
   compose file does not implement that. The consequence is severe: `prisma db
   push` treats Keycloak's 31 tables as unknown and offers to delete them, which
   destroys the realm, its users and its roles. Worked around by moving the
   application into its own `foodshare` schema. The complete fix is
   `KC_DB_SCHEMA: keycloak` in `docker-compose.yml` — Member 1's file.

---

## 9. Session log

Append each working session below. Keep the handbook above updated in step, so
it always describes the current state rather than the history.

### Session 1 — 2026-08-03 — Epics 3.1 and 3.2

**Done.** Read the report, the work breakdown and Member 2's entire frontend
contract before writing any code, because his screens were already built and
tested against a fixed response shape. Extracted four fixed constraints:
pagination envelope, ISO dates, error format, and resolving users by Keycloak
subject.

Found and fixed the three defects in section 7. Built the shared foundations in
`src/lib`, both modules, and 29 tests. Verified everything against a real
PostgreSQL and RabbitMQ.

**Result:** roughly 2,000 lines added across 33 files. Typecheck clean, build
clean, 29 tests passing, all 16 endpoint scenarios behaving correctly.

**Next:** run the frontend against the real API and click through the donor
journey (Task 3.2.3).

### Session 2 — 2026-08-03 — Local verification on Windows

**Done.** Ran the full setup on a Windows development machine. Everything
verified: `prisma db push`, `prisma generate`, typecheck clean, 29 tests
passing, API booting with RabbitMQ connected.

**Three environment problems found and fixed, all now documented in the setup
instructions so nobody repeats them:**

1. *A locally installed PostgreSQL service was holding port 5432*, so the
   project's container could not bind to it. The first error was "can't reach
   the database"; the second, after the Windows service started, was
   "authentication failed" — because that server has never heard of the
   `foodshare` user. Stopping the Windows service resolved it.

2. *Keycloak and the application shared the `public` schema*, so `prisma db
   push` offered to delete all 31 Keycloak tables. Accepting that warning
   destroyed the realm and its users, and the containers had to be recreated
   from scratch. Fixed by moving the application into its own `foodshare`
   schema. Now open item 8 above.

3. *npm blocked Prisma's install script*, so the database client was never
   generated. This produced 41 "has no exported member" type errors and
   `Cannot find module '.prisma/client/default'` at startup. Notably, `npm test`
   still passed 29/29 throughout — the validation and mapper tests use
   type-only imports, which TypeScript erases at runtime, so they never touch
   Prisma. A useful reminder that passing unit tests does not mean the
   application runs.

**Result:** backend fully working locally. Task 3.2.3 (browser click-through)
still outstanding, blocked on Keycloak test-user setup rather than on any code.

**Next:** create a donor test user in Keycloak, complete the donor journey in
the browser, and confirm `DonationPosted` and `DonationCancelled` reach the
queue from real user actions.

### Session 2 — (add the next session here)