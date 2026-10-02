import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.DATABASE_URL || 'postgresql://foo:bar@baz/db';
console.log("Using URL:", url.substring(0, 30) + '...');

async function test() {
  try {
    console.log("Testing with Pool");
    const pool = new Pool({ connectionString: url });
    await pool.query("SELECT 1 as val");
    console.log("Pool query successful!");
  } catch(e) {
    console.error("Pool error:", e.message);
  }
}
test();
