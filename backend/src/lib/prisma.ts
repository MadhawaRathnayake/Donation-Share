import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://foodshare:foodshare_password@localhost:5433/foodshare_db?schema=prisma';
const pool = new Pool({ connectionString });

pool.on('connect', (client) => {
  client.query('SET search_path TO prisma, public');
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

export default prisma;
