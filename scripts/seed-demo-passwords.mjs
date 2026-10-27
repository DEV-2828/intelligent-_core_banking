import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

const pool = await mysql.createPool({
  host: process.env.MYSQL_HOST ?? "127.0.0.1",
  port: Number(process.env.MYSQL_PORT ?? 3306),
  user: process.env.MYSQL_USER ?? "root",
  password: process.env.MYSQL_PASSWORD ?? "",
  database: process.env.MYSQL_DATABASE ?? "intelligent_core_banking",
});

const users = [
  ["arjun@example.com", "Customer@123"],
  ["neha@example.com", "Customer@123"],
  ["officer@example.com", "Officer@123"],
  ["admin@example.com", "Admin@123"],
];

for (const [email, password] of users) {
  const hash = await bcrypt.hash(password, 12);
  await pool.query("UPDATE users SET password_hash=? WHERE email=?", [hash, email]);
  console.log(`Updated ${email}`);
}
await pool.end();
console.log("Demo passwords are ready.");
