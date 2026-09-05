# FoodShare: Food Waste Redistribution Platform

FoodShare is a structured software platform that connects verified food donors (restaurants, supermarkets, hotels) with recipients (charities, shelters, community kitchens) and volunteers. It replaces ad-hoc manual coordination with a transparent, auditable, and time-aware process to rescue surplus edible food before it expires.

---

## 🚀 How to Run the Project

This project uses a modular monolith architecture. To run it locally, you must start the infrastructure, the backend API, and the frontend web app. Please follow these steps in order:

### Prerequisites
*   [Docker](https://www.docker.com/) and Docker Compose installed.
*   [Node.js](https://nodejs.org/) (v20 or higher recommended) and `npm` installed.

### Step 1: Start the Infrastructure
We use Docker to run PostgreSQL (Database), RabbitMQ (Event Broker), and Keycloak (Identity & Authentication). 

1. Open a terminal and navigate to the project root:
   ```bash
   cd FoodShare
   ```
2. Start the containers in the background:
   ```bash
   docker-compose up -d
   ```
*(Note: On the very first run, Keycloak will automatically import the FoodShare realm from `keycloak/realm-export.json`.)*

### Step 2: Configure and Set Up the Database
Before running the backend API, create its environment file and push the Prisma schema to PostgreSQL so the tables exist.

1. Open a new terminal and navigate to the backend directory:
   ```bash
   cd FoodShare/backend
   ```
2. Create your local environment file from the documented template:
   ```bash
   cp .env.example .env
   ```
   The defaults match the `docker-compose.yml` services, so no edit is needed for local development.
3. Install dependencies and generate the Prisma client:
   ```bash
   npm ci
   npm approve-scripts esbuild
   npm approve-scripts prisma
   npm approve-scripts @prisma/engines
   npx prisma generate
   ```
4. Create the application's database schema, then push the tables into it:
   ```bash
   docker exec foodshare-db psql -U foodshare -d foodshare_db -c "CREATE SCHEMA IF NOT EXISTS foodshare;"
   npx prisma db push
   ```
   *(If you ever see a data-loss warning naming Keycloak tables, answer **no**).*

### Step 3: Start the Backend API
The backend is a Node.js Express server.
1. Ensure you are in the `backend` directory.
2. Start the development server and notification worker:
   ```bash
   npm run dev
   # (Optionally, run the worker in a separate terminal: npm run worker)
   ```
The API will start and should display: `FoodShare API is running at http://localhost:3000`

### Step 4: Start the Frontend Web App
The frontend is a React Single Page Application (SPA) powered by Vite.
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd FoodShare/frontend
   ```
2. Start the development server:
   ```bash
   npm install
   npm run dev
   ```
3. Open your browser and go to `http://localhost:5173`.

---

## 🔐 Logging In and Registration

Keycloak handles all authentication for the platform.
1. Go to the frontend application and click **"Get Started / Login"**.
2. **To login as Admin:** Use Username: `admin_user` / Password: `admin123`.
3. **To log in as a standard user (Donor, Recipient, Volunteer):** Click the **"Register"** link on the Keycloak login screen, create an account, and complete the Onboarding Flow inside the app to select your role and profile details.

---

## ✅ Work Done

The core functionality of the FoodShare platform has been successfully implemented:
- **Member 2 (Frontend Architecture):** Built the complete React/Vite UI, Tailwind design system, shared components, Role-aware routing, Keycloak integration, and all workspace dashboards (Donor, Recipient, Volunteer, Admin).
- **Member 3 (Backend Domain 1):** Implemented the User Profile API (with geospatial geocoding) and the core Donation module (creating, retrieving, and cancelling donations). Fixed JWT verification security issues.
- **Member 4 (Backend Domain 2):** Implemented the Claim Module with robust transaction locking to prevent concurrency issues (double-booking food) and advanced geospatial search and filtering for donations.
- **Member 5 (Events & Logistics):** Implemented the RabbitMQ event publisher, the standalone Notification Worker daemon, and the Pickup state machine for volunteers.

---

## 🚧 Work Left (Pending Tasks)

The remaining work falls entirely under **Member 1 (DevOps & Platform Lead)** responsibilities, specifically regarding production readiness and CI/CD:

1. **Epic 1.1 - CI/CD Pipeline (GitHub Actions):** There is currently no automated testing or deployment pipeline. A `.github/workflows` directory needs to be created to run tests (`vitest`) and build Docker images.
2. **Epic 1.1 - Observability & Monitoring:** The backend relies on `console.log`. Production-grade logging (e.g., Winston) and metrics collection (Prometheus/Grafana or Datadog) need to be integrated.
3. **Epic 1.1 - Production Environment Deployment:** Scripts or configurations (Terraform, AWS CloudFormation) are required to deploy the PostgreSQL database (AWS RDS), RabbitMQ cluster (Amazon MQ), and Keycloak IAM to a live production environment.
4. **Epic 1.2 - Admin Dashboard Polish:** The backend Admin APIs are complete, but the frontend Admin Dashboard still requires the integration of a charting library (like Recharts) to visually display platform statistics.

---

## 🏗️ Architecture Overview

The system is built as a **Layered Modular Monolith with an Event-Driven Notification Backbone**:

*   **Frontend:** React (TypeScript) + Tailwind CSS (v4) + Vite.
*   **Backend:** Node.js + Express (TypeScript).
*   **Database ORM:** Prisma interacting with PostgreSQL.
*   **Identity & Access:** Keycloak (OIDC/OAuth2).
*   **Messaging Backbone:** RabbitMQ (decouples core transactions from email/notification dispatch).

The codebase is logically split into internal modules: `User & Profile`, `Donation`, `Claim`, `Pickup/Volunteer`, `Notification`, and `Admin`.