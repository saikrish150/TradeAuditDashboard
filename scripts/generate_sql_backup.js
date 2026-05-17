import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const OWNER_EMAIL = process.env.VITE_OWNER_EMAIL;
const GUEST_USER_ID = '00000000-0000-0000-0000-000000000000';

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase configuration in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateBackup() {
  console.log("🚀 Starting Script Backup Generation...");
  
  // We need a userId. Since we are running as a script, we might need to find the user id first if not known.
  // However, based on the previous analysis, I know the user is usually filtered by user_id.
  // I'll try to fetch all records (since I'm using Service Role Key, I can do that).
  
  const tables = ['trades', 'snapshots', 'notes', 'goals', 'alerts'];
  let sqlOutput = `-- ═══════════════════════════════════════════════════\n`;
  sqlOutput += `-- SUPABASE MASTER SQL BACKUP\n`;
  sqlOutput += `-- Generated: ${new Date().toISOString()}\n`;
  sqlOutput += `-- ═══════════════════════════════════════════════════\n\n`;
  
  sqlOutput += `SET statement_timeout = 0;\n`;
  sqlOutput += `SET lock_timeout = 0;\n`;
  sqlOutput += `SET client_encoding = 'UTF8';\n`;
  sqlOutput += `SET standard_conforming_strings = on;\n`;
  sqlOutput += `SET check_function_bodies = false;\n`;
  sqlOutput += `SET xmloption = content;\n`;
  sqlOutput += `SET client_min_messages = warning;\n`;
  sqlOutput += `SET row_security = off;\n\n`;

  for (const table of tables) {
    console.log(`📦 Fetching data from [${table}]...`);
    const { data, error } = await supabase.from(table).select('*');
    
    if (error) {
      console.error(`❌ Error fetching ${table}:`, error.message);
      continue;
    }

    if (!data || data.length === 0) {
      console.log(`⚠️ Table [${table}] is empty.`);
      continue;
    }

    sqlOutput += `-- -----------------------------------------------------\n`;
    sqlOutput += `-- Table: ${table}\n`;
    sqlOutput += `-- -----------------------------------------------------\n\n`;

    // Reconstruct column names
    const columns = Object.keys(data[0]);
    
    // Optional: Generate a simple CREATE TABLE if we wanted to, 
    // but the user likely wants the data script to run on their existing tables.
    // We'll focus on INSERTs.

    data.forEach(row => {
      const values = columns.map(col => {
        const val = row[col];
        if (val === null) return 'NULL';
        if (typeof val === 'string') {
          // Escape single quotes
          return `'${val.replace(/'/g, "''")}'`;
        }
        if (typeof val === 'object') {
          return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
        }
        return val;
      });

      sqlOutput += `INSERT INTO public."${table}" ("${columns.join('", "')}") VALUES (${values.join(', ')});\n`;
    });

    sqlOutput += `\n`;
  }

  const outputPath = path.join(process.cwd(), 'full_backup.sql');
  fs.writeFileSync(outputPath, sqlOutput);
  console.log(`\n✅ Backup successfully saved to: ${outputPath}`);
}

generateBackup().catch(err => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
