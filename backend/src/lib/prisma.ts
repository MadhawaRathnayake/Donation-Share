import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL ??
  'postgresql://foodshare:foodshare_password@localhost:5433/foodshare_db?schema=prisma';

/**
 * `pg` ignores the `?schema=` parameter that Prisma understands, so it is read
 * from the connection URL here and passed to the adapter explicitly.
 *
 * This has to reach the adapter, not just the connection: the adapter writes
 * fully-qualified table names into every generated query, so without a schema
 * it emits `public."User"` regardless of the connection's search_path. Setting
 * search_path in a `pool.on('connect')` handler therefore cannot fix it — and
 * that handler also races the first real query, which is what produced the
 * "client is already executing a query" deprecation warning.
 */
const schema = new URL(connectionString).searchParams.get('schema') ?? 'public';

const pool = new Pool({ connectionString });

const adapter = new PrismaPg(pool, { schema });

const prisma = new PrismaClient({ adapter });

export default prisma;