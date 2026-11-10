export async function runSql(connection, source) {
 let delimiter=";",buffer="";
 for(const line of source.split(/\r?\n/)) {
  if(/^DELIMITER\s+/i.test(line.trim())) {delimiter=line.trim().split(/\s+/)[1];continue;}
  buffer+=line+"\n";
  if(buffer.trimEnd().endsWith(delimiter)) {const sql=buffer.trimEnd().slice(0,-delimiter.length).trim();if(sql)await connection.query(sql);buffer="";}
 }
 if(buffer.replace(/--[^\n]*/g,"").trim())throw new Error("Unterminated SQL statement");
}
