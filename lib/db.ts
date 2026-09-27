import { neon } from "@neondatabase/serverless";

let client: ReturnType<typeof neon> | null | undefined;

export function getDb() {
  if (client !== undefined) return client;

  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED;

  if (!url) {
    client = null;
    return client;
  }

  client = neon(url);
  return client;
}
