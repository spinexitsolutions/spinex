import { MongoClient, type Db } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _spinexMongo: Promise<MongoClient> | undefined;
}

export const hasDb = () => !!process.env.MONGODB_URI;

// One shared connection per server process (and across hot reloads in dev).
export async function getDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set in .env.local");
  if (!global._spinexMongo) {
    global._spinexMongo = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 }).connect().catch((e) => {
      global._spinexMongo = undefined; // let the next request try again
      throw e;
    });
  }
  const client = await global._spinexMongo;
  return client.db(process.env.MONGODB_DB || "spinex");
}
