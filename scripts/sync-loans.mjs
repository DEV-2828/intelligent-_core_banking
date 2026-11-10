import {deliverLoanEvents} from "../lib/loan-sync.ts";import {db} from "../lib/mysql.ts";
try {const result=await deliverLoanEvents(100);console.log(result);if(result.failed)process.exitCode=1;}finally{await db.end();await global.__mongoClientPromise?.then(c=>c.close()).catch(()=>{});}
