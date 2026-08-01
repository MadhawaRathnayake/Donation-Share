# FoodShare: Comprehensive Project Roadmap & Work Breakdown

This document provides an exhaustive, multi-level breakdown of the entire FoodShare platform development lifecycle. The work is distributed across 5 team members to ensure parallel development, prevent merge conflicts, and leverage specialized skills.

---

## 👥 Team Assignments & Core Responsibilities

*   **Member 1 (DevOps & Platform Lead):** Infrastructure, Keycloak IAM, CI/CD, Admin Module.
*   **Member 2 (Frontend Architect):** React Foundation, UI Design System, Shared Components, User Profile UI.
*   **Member 3 (Backend Core - Domain 1):** User Profile API, Donation Module (API & DB).
*   **Member 4 (Backend Core - Domain 2):** Claim Module (Concurrency/Locking), Search & Filtering.
*   **Member 5 (Event & Logistics Lead):** RabbitMQ Workers, Notification Service, Pickup Module.

---

## 🏗️ Member 1: DevOps & Platform Lead

**Focus:** Ensuring the platform is stable, secure, deployable, and manageable.

### Epic 1.1: Infrastructure & CI/CD Pipeline
*   **Task 1.1.1: Production Environment Setup**
    *   Subtask: Provision AWS RDS (PostgreSQL) or managed DB equivalent.
    *   Subtask: Provision managed RabbitMQ (e.g., Amazon MQ) cluster.
    *   Subtask: Set up managed Keycloak instance or dedicated EC2 for IAM.
*   **Task 1.1.2: CI/CD Pipeline (GitHub Actions)**
    *   Subtask: Create action for automated testing (Backend Jest, Frontend Vitest).
    *   Subtask: Create Docker image build and push to container registry.
    *   Subtask: Automate deployment to staging environment on `main` branch merge.
*   **Task 1.1.3: Observability & Monitoring**
    *   Subtask: Integrate basic logging (e.g., Winston) in backend.
    *   Subtask: Set up Prometheus/Grafana or Datadog for API endpoint metrics.
    *   Subtask: Monitor RabbitMQ queue lengths to ensure workers aren't falling behind.

### Epic 1.2: Admin Module (Full Stack)
*   **Task 1.2.1: Admin API Endpoints**
    *   Subtask: `GET /api/admin/users` - Fetch all registered users.
    *   Subtask: `PUT /api/admin/users/:id/verify` - Approve charity organizations.
    *   Subtask: `GET /api/admin/stats` - Fetch platform metrics (total food rescued, active users).
*   **Task 1.2.2: Admin Dashboard (Frontend)**
    *   Subtask: Build Data Table component with sorting and pagination for users.
    *   Subtask: Create "Pending Approvals" view for Recipient onboarding.
    *   Subtask: Integrate charting library (e.g., Recharts) for platform statistics.

---

## 🎨 Member 2: Frontend Architect

**Focus:** Creating a cohesive, accessible, and responsive user experience.

### Epic 2.1: Design System & Shared Component Library
*   **Task 2.1.1: UI Primitives (Tailwind)**
    *   Subtask: Define strict color palette, typography, and spacing tokens in `tailwind.config.js`.
    *   Subtask: Build reusable `Button`, `Input`, `Select`, and `Modal` components.
    *   Subtask: Build `Toast` component for global success/error messages.
*   **Task 2.1.2: Data Display Components**
    *   Subtask: Create `DonationCard` (displays food image, expiry, quantity).
    *   Subtask: Create `StatusBadge` (colors for Pending, Claimed, In Transit, Completed).
    *   Subtask: Build `EmptyState` and `LoadingSkeleton` components.

### Epic 2.2: User Authentication & Profile UI
*   **Task 2.2.1: Onboarding Flow**
    *   Subtask: Build Role Selection screen (Donor vs. Recipient vs. Volunteer).
    *   Subtask: Build "Complete Profile" form (Organization name, address, tax ID).
    *   Subtask: Connect form to `POST /api/users/profile`.
*   **Task 2.2.2: Profile Management Dashboard**
    *   Subtask: Build UI to display current profile data.
    *   Subtask: Build edit mode (update phone number, operating hours).
    *   Subtask: Handle Keycloak account management redirect for password changes.

---

## ⚙️ Member 3: Backend Core - Domain 1 (Donations)

**Focus:** Managing the creation and lifecycle of the core entity: Food Donations.

### Epic 3.1: User Profile API
*   **Task 3.1.1: Profile CRUD Operations**
    *   Subtask: `POST /api/users/profile` - Create donor/recipient specific metadata in Postgres.
    *   Subtask: `GET /api/users/profile/me` - Fetch own profile.
    *   Subtask: `PUT /api/users/profile/me` - Update contact/address details.
*   **Task 3.1.2: Location Services integration**
    *   Subtask: Integrate Geocoding API (e.g., Google Maps API) to convert address to Lat/Lng on profile save.
    *   Subtask: Store geospatial data in Postgres (PostGIS extension or simple float columns).

### Epic 3.2: Complete Donation Module
*   **Task 3.2.1: Advanced Donation Creation**
    *   Subtask: Implement image upload (AWS S3 or local disk) for food photos.
    *   Subtask: Add strict validation (expiry time must be in future, quantity > 0).
*   **Task 3.2.2: Donor Dashboard APIs**
    *   Subtask: `GET /api/donations/me` - List all donations created by the logged-in donor.
    *   Subtask: `PUT /api/donations/:id/cancel` - Allow donor to cancel if not yet claimed.
    *   Subtask: Publish `DonationCancelled` event to RabbitMQ.
*   **Task 3.2.3: Frontend Integration**
    *   Subtask: Build the "Post Donation" form UI (coordinate with Member 2).
    *   Subtask: Build the Donor's "My History" view.

---

## 🔒 Member 4: Backend Core - Domain 2 (Claims & Matching)

**Focus:** Ensuring safe, concurrent transactions and connecting recipients to food.

### Epic 4.1: Search, Filter, and Discovery
*   **Task 4.1.1: Advanced Querying API**
    *   Subtask: Implement pagination for `GET /api/donations`.
    *   Subtask: Add filters: `?type=produce`, `?maxDistance=5km`, `?expiringSoon=true`.
    *   Subtask: Write complex Prisma query for geospatial bounding box (if PostGIS used) or basic distance calculation.
*   **Task 4.1.2: Recipient Discovery UI**
    *   Subtask: Build "Available Food" feed with filter sidebars.
    *   Subtask: Implement infinite scrolling or pagination controls.

### Epic 4.2: The Claim Module (CRITICAL PATH)
*   **Task 4.2.1: Transactional Claim API**
    *   Subtask: `POST /api/claims`.
    *   Subtask: **Concurrency Lock:** Implement Prisma transactions to ensure `Donation` status changes from `Posted` to `Claimed` safely. Check if already claimed *inside* the transaction to prevent double-booking.
    *   Subtask: Create `Claim` record linking Recipient ID to Donation ID.
*   **Task 4.2.2: Post-Claim Hooks**
    *   Subtask: Publish `DonationClaimed` event to RabbitMQ (payload includes donor, recipient, and donation details).
    *   Subtask: Build Recipient "My Claims" UI dashboard to track food they have successfully secured.

---

## 🚚 Member 5: Event & Logistics Lead

**Focus:** Asynchronous background processes, physical logistics, and real-time updates.

### Epic 5.1: Standalone Notification Service (Worker)
*   **Task 5.1.1: RabbitMQ Consumer Daemon**
    *   Subtask: Create a separate Node.js process (or worker thread) that listens to `notification_queue`.
    *   Subtask: Implement exponential backoff/retry logic for failed message processing.
*   **Task 5.1.2: Multi-Channel Delivery**
    *   Subtask: Implement Email service (Nodemailer).
    *   Subtask: Implement SMS service (Twilio) for urgent "Driver Arrived" alerts.
    *   Subtask: Map event types to templates (e.g., `DonationClaimed` -> Email to Donor).
*   **Task 5.1.3: In-App Notifications**
    *   Subtask: Write consumed events to a `Notification` table in DB.
    *   Subtask: `GET /api/notifications` API for frontend polling.
    *   Subtask: Build a dropdown Notification Bell UI component in the Header.

### Epic 5.2: Pickup & Volunteer Logistics
*   **Task 5.2.1: Pickup State Machine API**
    *   Subtask: `POST /api/pickups/accept` - Volunteer claims a delivery job.
    *   Subtask: `PUT /api/pickups/:id/status` - Transition states (`In Transit` -> `Delivered`).
    *   Subtask: Publish `PickupStatusChanged` event on every transition.
*   **Task 5.2.2: Logistics UI**
    *   Subtask: Build Volunteer "Available Jobs" feed (similar to Uber/Doordash driver view).
    *   Subtask: Build Active Delivery screen showing Donor Address and Recipient Address.
    *   Subtask: Add "Confirm Delivery" button that triggers the final state change.

---

## 📅 Suggested Sprint Schedule (4 Sprints)

*   **Sprint 1 (Foundation):** Environment setup, IAM configured, DB Schema finalized, Base UI Layouts built, Base API setup. (Mostly done via initial scaffolding).
*   **Sprint 2 (Core Loop):** Profiles created, Donations can be posted (Member 3), Donations can be viewed and safely Claimed (Member 4), Shared UI components finalized (Member 2).
*   **Sprint 3 (Logistics & Events):** RabbitMQ worker processing emails (Member 5), Volunteers can accept pickups, Admin dashboard built (Member 1), Real-time notifications working.
*   **Sprint 4 (Polish & Deploy):** Geospatial search refined, Image uploads working, CI/CD pipeline deploys to production, Final UI/UX polish, End-to-End testing.
