import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : false,
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id               SERIAL PRIMARY KEY,
      email            TEXT UNIQUE NOT NULL,
      "passwordHash"   TEXT NOT NULL,
      "displayName"    TEXT NOT NULL,
      "googleRefreshToken" TEXT DEFAULT NULL,
      "createdAt"      TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id          SERIAL PRIMARY KEY,
      "userId"    INTEGER NOT NULL REFERENCES users(id),
      name        TEXT NOT NULL,
      duration    INTEGER DEFAULT 30,
      priority    TEXT DEFAULT 'Med',
      status      TEXT DEFAULT 'pending',
      categories  TEXT DEFAULT '[]',
      description TEXT DEFAULT '',
      "sortOrder" INTEGER DEFAULT 0,
      blocker     TEXT DEFAULT NULL,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      "completedAt" TIMESTAMPTZ DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS goals (
      id          SERIAL PRIMARY KEY,
      "userId"    INTEGER NOT NULL REFERENCES users(id),
      title       TEXT NOT NULL,
      target      INTEGER DEFAULT 100,
      current     INTEGER DEFAULT 0,
      label       TEXT DEFAULT 'Key Result',
      "createdAt" TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notification_configs (
      "userId"          INTEGER PRIMARY KEY REFERENCES users(id),
      email             TEXT DEFAULT '',
      morning           BOOLEAN DEFAULT FALSE,
      midday            BOOLEAN DEFAULT FALSE,
      eod               BOOLEAN DEFAULT FALSE,
      "gcalMorningId"   TEXT DEFAULT NULL,
      "gcalMiddayId"    TEXT DEFAULT NULL,
      "gcalEodId"       TEXT DEFAULT NULL,
      "updatedAt"       TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

export default pool;
