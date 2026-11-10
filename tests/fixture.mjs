import mysql from "mysql2/promise";import {MongoClient} from "mongodb";import {randomUUID} from "node:crypto";import {readFile} from "node:fs/promises";import bcrypt from "bcryptjs";
import {runSql} from "../database/sql-runner.mjs";import {migrate} from "../scripts/migrate-mysql.mjs";import {setupMongo} from "../scripts/setup-mongo.mjs";
export const customer={userId:"11111111-1111-4111-8111-111111111111",email:"arjun@example.com",firstName:"Arjun",lastName:"Mehta",role:"customer"};
export const second={...customer,userId:"22222222-2222-4222-8222-222222222222",email:"neha@example.com",firstName:"Neha"};
export const officer={...customer,userId:"33333333-3333-4333-8333-333333333333",role:"loan_officer",email:"officer@example.com"};
export const admin={...customer,userId:"44444444-4444-4444-8444-444444444444",role:"risk_admin",email:"admin@example.com"};
export const source="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",destination="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",bank="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4",repaymentBank="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3";
export async function fixture(){
 const name="icb_test_"+randomUUID().replaceAll("-","").slice(0,12);if(!/^icb_test_[a-f0-9]{12}$/.test(name))throw new Error("Unsafe test database name");
 const connection=await mysql.createConnection({host:process.env.MYSQL_HOST??"127.0.0.1",port:Number(process.env.MYSQL_PORT??3306),user:process.env.MYSQL_USER??"root",password:process.env.MYSQL_PASSWORD??"",decimalNumbers:true,dateStrings:true});
 await connection.query("CREATE DATABASE "+name+" CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci");await connection.changeUser({database:name});
 const client=new MongoClient(process.env.MONGODB_URI??"mongodb://127.0.0.1:27017",{serverSelectionTimeoutMS:3000});
 async function cleanup(){try{await client.db(name).dropDatabase();}finally{await client.close();await connection.query("DROP DATABASE "+name);await connection.end();}}
 try{
 const base=(await readFile(new URL("../intelligent_core_banking_mysql.sql",import.meta.url),"utf8")).replace(/^DROP DATABASE[^\n]*\r?\n/m,"").replace(/^CREATE DATABASE[^\n]*\r?\n/m,"").replace(/^USE intelligent_core_banking;\r?\n/m,"");
 await runSql(connection,base);await migrate(connection);await migrate(connection);await client.connect();await setupMongo(client.db(name),true);
 await connection.query("UPDATE users SET password_hash=?",[await bcrypt.hash("TestPassword@123",4)]);
 process.env.MYSQL_DATABASE=name;process.env.MONGODB_DB=name;process.env.BANK_DISBURSEMENT_ACCOUNT_ID=bank;process.env.BANK_REPAYMENT_ACCOUNT_ID=repaymentBank;
 return {name,sql:connection,mongo:client.db(name),cleanup};
 }catch(error){await cleanup();throw error;}
}
