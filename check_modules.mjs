import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute('SELECT COUNT(*) as c FROM learning_modules');
console.log('modules:', rows[0].c);
const [rows2] = await conn.execute('SELECT COUNT(*) as c FROM assessment_items WHERE blueprint_id = "bp-aiq-v10-standard"');
console.log('v10 items:', rows2[0].c);
await conn.end();
