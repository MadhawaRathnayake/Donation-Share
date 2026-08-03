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
   The defaults match the `docker-compose.yml` services, so no edit is needed for local development. `.env` is gitignored — never commit it.
3. Install dependencies and generate the Prisma client:
   ```bash
   npm ci
   npm approve-scripts esbuild
   npm approve-scripts prisma
   npm approve-scripts @prisma/engines
   npx prisma generate
   ```
   Newer versions of npm block package install scripts by default. Prisma's
   install script is what generates the database client, so without approving it
   `npm run dev` fails with `Cannot find module '.prisma/client/default'`.
4. Create the application's database schema, then push the tables into it:
   ```bash
   docker exec foodshare-db psql -U foodshare -d foodshare_db -c "CREATE SCHEMA IF NOT EXISTS foodshare;"
   npx prisma db push
   ```
   The application deliberately uses its own `foodshare` schema rather than
   `public`, because Keycloak stores its tables in the same database. If both
   share `public`, `prisma db push` reports that it is about to delete 31
   Keycloak tables — accepting that warning destroys the realm, its users and
   its roles.

   If you ever see a data-loss warning naming tables such as
   `authentication_flow` or `keycloak_role`, answer **no** and check this
   setting.

### Step 3: Start the Backend API
The backend is a Node.js Express server.

1. Ensure you are in the `backend` directory.
2. Start the development server:
   ```bash
   npm run dev
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
   npm run dev
   ```
3. Open your browser and go to `http://localhost:5173`.

---

## 🔐 Default Test Accounts

Keycloak has been pre-configured with the necessary roles (`Donor`, `Recipient`, `Volunteer`, `Admin`). 

To test the application immediately, click **"Get Started / Login"** on the frontend homepage and use the following credentials:

*   **Username:** `admin_user`
*   **Password:** `admin123`

This user has the `Admin` role. Upon logging in, the frontend Sidebar will automatically display the "Admin Panel" link.

---

## 🏗️ Architecture Overview

The system is built as a **Layered Modular Monolith with an Event-Driven Notification Backbone**:

*   **Frontend:** React (TypeScript) + Tailwind CSS (v4) + Vite.
*   **Backend:** Node.js + Express (TypeScript).
*   **Database ORM:** Prisma interacting with PostgreSQL.
*   **Identity & Access:** Keycloak (OIDC/OAuth2).
*   **Messaging Backbone:** RabbitMQ (decouples core transactions from email/notification dispatch).

The codebase is logically split into internal modules: `User & Profile`, `Donation`, `Claim`, `Pickup/Volunteer`, `Notification`, and `Admin`.