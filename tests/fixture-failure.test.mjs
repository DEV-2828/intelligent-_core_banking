import test from "node:test";
import assert from "node:assert/strict";
import mysql from "mysql2/promise";
import {fixture} from "./fixture.mjs";

test("unreachable MongoDB preserves the setup error and removes its SQL fixture", {timeout:15000}, async()=>{
 const sql=await mysql.createConnection({host:process.env.MYSQL_HOST??"127.0.0.1",port:Number(process.env.MYSQL_PORT??3306),user:process.env.MYSQL_USER??"root",password:process.env.MYSQL_PASSWORD??""});
 const previousUri=process.env.MONGODB_URI;
 try {
  const [before]=await sql.query("SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME REGEXP '^icb_test_[a-f0-9]{12}$' ORDER BY SCHEMA_NAME");
  process.env.MONGODB_URI="mongodb://127.0.0.1:1";
  await assert.rejects(fixture(),error=>{assert.equal(error.name,"MongoServerSelectionError");return true;});
  const [after]=await sql.query("SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME REGEXP '^icb_test_[a-f0-9]{12}$' ORDER BY SCHEMA_NAME");
  assert.deepEqual(after,before,"Failed setup must not leave a generated SQL database behind");
 }finally{
  if(previousUri===undefined)delete process.env.MONGODB_URI;else process.env.MONGODB_URI=previousUri;
  await sql.end();
 }
});
