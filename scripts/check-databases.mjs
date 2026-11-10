import mysql from "mysql2/promise";
import { MongoClient } from "mongodb";
const sql = await mysql.createConnection({host:process.env.MYSQL_HOST,port:Number(process.env.MYSQL_PORT??3306),user:process.env.MYSQL_USER,password:process.env.MYSQL_PASSWORD,database:process.env.MYSQL_DATABASE,connectTimeout:3000});
try { await sql.query("SELECT 1"); console.log("MySQL: ready"); } finally { await sql.end(); }
const mongo = new MongoClient(process.env.MONGODB_URI, {serverSelectionTimeoutMS:3000});
try { await mongo.connect(); await mongo.db(process.env.MONGODB_DB).command({ping:1}); console.log("MongoDB: ready"); } finally { await mongo.close(); }
