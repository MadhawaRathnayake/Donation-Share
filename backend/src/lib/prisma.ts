import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { env } from './env';

// Keycloak owns the `public` schema of the shared database, so the application
// lives in the schema named by DATABASE_URL (`?schema=foodshare`).
const schema = new URL(env.databaseUrl).searchParams.get('schema') ?? 'foodshare';

const pool = new Pool({ connectionString: env.databaseUrl });

const adapter = new PrismaPg(pool, { schema });

const prisma = new PrismaClient({ adapter });

export default prisma;
