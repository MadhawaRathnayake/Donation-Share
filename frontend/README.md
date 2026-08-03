# FoodShare frontend

The FoodShare web application is a React 19, TypeScript, Tailwind CSS, TanStack Query, and Keycloak SPA. Its interface uses a warm neutral foundation, forest-green brand actions, amber urgency cues, blue logistics states, and red failure states. Every status also includes text and an icon so meaning never depends on color alone.

## Local setup

1. Copy `.env.example` to `.env.local` and review the service URLs.
2. Install packages with `npm ci`.
3. Start the infrastructure and backend from the repository instructions.
4. Run `npm run dev`.

For frontend-only development, set both `VITE_USE_MOCK_API=true` and `VITE_USE_MOCK_AUTH=true`. Optional `VITE_MOCK_ROLE` values are `Donor`, `Recipient`, `Volunteer`, and `Admin`. Mock switches are ignored in production builds.

## Quality commands

- `npm run lint` — static analysis
- `npm run build` — TypeScript and production bundle
- `npm test` — Vitest and Testing Library
- `npx playwright install chromium` — one-time browser setup
- `npm run test:e2e` — desktop and mobile onboarding smoke tests

## Backend handoff contracts

All UI code calls the typed boundary in `src/services/contracts.ts`. Backend members should preserve these response conventions:

- Pagination: `{ items, page, pageSize, total }`
- Dates: ISO-8601 UTC strings
- Errors: `{ code, message, fieldErrors? }`
- Role names: `Donor`, `Recipient`, `Volunteer`, `Admin`

Member 1 owns `/api/admin/*` and Keycloak role configuration. Member 3 owns `/api/users/profile*` and donor donation endpoints. Member 4 owns donation discovery and claims. Member 5 owns notifications and pickup logistics.

The backend must resolve authenticated users by Keycloak `sub` against `User.keycloakId`; it must not treat the Keycloak identifier as the database UUID. Role selection is submitted through the profile endpoint, but role assignment must happen securely on the server—never through Keycloak administration credentials in this application.

## Manual acceptance checklist

- Test Donor, Recipient, Volunteer, and Admin in separate sessions.
- Check mobile, tablet, laptop, and wide-desktop layouts.
- Navigate every control with the keyboard and verify visible focus.
- Verify empty, loading, validation, authorization, conflict, and server-error states.
- Test once with mock services and once against the integrated backend.
