import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await createConnection(url);

try {
  // Check if column already exists
  const [rows] = await conn.execute(
    "SHOW COLUMNS FROM `ail_org_context` LIKE 'selected_initiatives_json'"
  );
  if (rows.length > 0) {
    console.log("Column already exists, skipping migration.");
  } else {
    await conn.execute(
      "ALTER TABLE `ail_org_context` ADD COLUMN `selected_initiatives_json` TEXT NULL"
    );
    console.log("Migration applied: selected_initiatives_json column added.");
  }
} finally {
  await conn.end();
}
