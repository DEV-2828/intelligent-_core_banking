import { Db, MongoClient } from "mongodb";
declare global { var __mongoClientPromise: Promise<MongoClient> | undefined; }
export async function mongoDb(): Promise<Db> {
  if (!global.__mongoClientPromise) {
    const client = new MongoClient(process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017", { serverSelectionTimeoutMS: 3000, connectTimeoutMS: 3000 });
    global.__mongoClientPromise = client.connect().catch(async error => {
      global.__mongoClientPromise = undefined;
      await client.close().catch(() => {});
      throw error;
    });
  }
  return (await global.__mongoClientPromise).db(process.env.MONGODB_DB ?? "credit_risk_engine");
}
