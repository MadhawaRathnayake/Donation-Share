# Member 2 — Frontend Architecture and UI/UX

**Developer:** Pasindu Jayasena  
**Email:** pasindujayasena.biz@gmail.com

## Completed responsibilities

This branch contains the complete Member 2 frontend contribution for FoodShare:

- Responsive React and TypeScript application foundation.
- Tailwind design tokens for brand colors, typography, semantic spacing, and shadows.
- Shared form, button, modal, confirmation, and toast components.
- Reusable donation cards, status badges, metrics, tables, pagination, empty states, error states, and loading skeletons.
- Keycloak authentication lifecycle, role-aware routes, protected workspaces, token refresh, and account-management redirect.
- Donor, Recipient, and Volunteer onboarding with role-specific validated profile forms.
- Profile display and editing for contact details, address, tax/registration ID, operating hours, service area, and availability.
- Complete Donor, Recipient, Volunteer, and Admin frontend workspaces.
- Typed HTTP service contracts and development-only mock services.
- Responsive navigation, notifications, accessibility states, and a professional food-rescue color system.

## Run the frontend

```powershell
cd frontend
npm ci
Copy-Item .env.example .env.local
npm run dev
```

To work without the unfinished backend, set these values in `.env.local`:

```env
VITE_USE_MOCK_API=true
VITE_USE_MOCK_AUTH=true
VITE_MOCK_ROLE=Donor
```

Mock role values are `Donor`, `Recipient`, `Volunteer`, and `Admin`. Production builds always use the real API and Keycloak.

## Verification

```powershell
npm run lint
npm run build
npm test
npm run test:e2e
```

The automated suite covers shared components, role-specific profile validation, HTTP contracts, mock domain workflows, route utilities, and desktop/mobile onboarding.

## Backend integration required from the team

- **Member 1:** Keycloak registration and role administration, test accounts, Admin endpoints, and CI execution.
- **Member 3:** Profile schema/API, Keycloak `sub` to `keycloakId` synchronization, donation creation/history/cancellation, and image upload.
- **Member 4:** Donation search/filtering, transactional claims, and claim history.
- **Member 5:** Notifications, read-state endpoints, pickup jobs, and delivery state transitions.

API shapes and detailed local setup are documented in [`frontend/README.md`](frontend/README.md).
