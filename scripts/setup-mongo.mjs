import { MongoClient } from "mongodb";
import { profileOptions, profileIndexes, demoProfiles } from "../database/mongo-schema.mjs";
export async function setupMongo(db, seed = false) {
  const names = (await db.listCollections({}, {nameOnly:true}).toArray()).map(c=>c.name);
  if (names.includes("credit_profiles")) await db.command({collMod:"credit_profiles",...profileOptions});
  else await db.createCollection("credit_profiles",profileOptions);
  for(const [key,opts] of profileIndexes) await db.collection("credit_profiles").createIndex(key,opts);
  await db.collection("loan_assessments").createIndex({loan_id:1},{unique:true});
  if(seed) for(const profile of demoProfiles) await db.collection("credit_profiles").updateOne({_id:profile._id},{$setOnInsert:profile},{upsert:true});
}
if (process.argv[1]?.endsWith("setup-mongo.mjs")) {
 const client = new MongoClient(process.env.MONGODB_URI,{serverSelectionTimeoutMS:3000});
 try {await client.connect();await setupMongo(client.db(process.env.MONGODB_DB),true); console.log("MongoDB validator, indexes and missing demo profiles are ready. Existing profiles preserved.");} finally {await client.close();}
}
