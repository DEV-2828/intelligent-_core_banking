import mysql from "mysql2/promise";
import {readFile} from "node:fs/promises";
import {runSql} from "../database/sql-runner.mjs";
export async function migrate(connection) {
 await connection.query("CREATE TABLE IF NOT EXISTS schema_migrations(version VARCHAR(80) PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
 const [done]=await connection.query("SELECT version FROM schema_migrations WHERE version='001_workflows'");if(done.length)return;
 const columns={payout_account_id:"CHAR(36) NULL",disbursed_at:"TIMESTAMP NULL",disbursement_transaction_id:"CHAR(36) NULL UNIQUE",assessment_snapshot:"JSON NULL",sync_version:"INT NOT NULL DEFAULT 1",decision_reason:"VARCHAR(500) NULL"};
 const [existing]=await connection.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='loans'");
 for(const [name,type] of Object.entries(columns))if(!existing.some(c=>c.COLUMN_NAME===name))await connection.query("ALTER TABLE loans ADD COLUMN "+name+" "+type);
 await runSql(connection,await readFile(new URL("../database/migrations/001_workflows.sql",import.meta.url),"utf8"));
 await connection.query("INSERT INTO schema_migrations(version) VALUES('001_workflows')");
}
if(process.argv[1]?.endsWith("migrate-mysql.mjs")){const connection=await mysql.createConnection({host:process.env.MYSQL_HOST,port:Number(process.env.MYSQL_PORT??3306),user:process.env.MYSQL_USER,password:process.env.MYSQL_PASSWORD,database:process.env.MYSQL_DATABASE});try{await migrate(connection);console.log("Workflow migration applied; existing banking data preserved.");}finally{await connection.end();}}
