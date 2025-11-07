import dotenv from 'dotenv';
dotenv.config({ path: ['.env', `.env.${process.env.NODE_ENV}`] });

let db;
let sql; 

// This is the correct check!
if (process.env.NODE_ENV === 'development') {
  
  // === DEVELOPMENT ===
  // We use the standard 'pg' (TCP) driver to talk to the 'neon-local' proxy
  
  console.log('✅ Running in Development Mode (using local proxy)');
  
  // Dynamically import the TCP drivers
  const { Pool } = await import('pg');
  const { drizzle: drizzleNode } = await import('drizzle-orm/node-postgres');

  // We use the DATABASE_URL from .env.development
  // (e.g., "postgresql://neon:npg@neon-local:5432/neondb")
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL, 
  });
  
  db = drizzleNode(pool);
  sql = pool; // You can export 'pool' if you need it

} else {
  
  // === PRODUCTION ===
  // We use the 'neon-http' (Serverless) driver to talk to the cloud
  
  console.log('🚀 Running in Production Mode (using serverless driver)');
  
  // Dynamically import the HTTP drivers
  const { neon } = await import('@neondatabase/serverless');
  const { drizzle: drizzleHttp } = await import('drizzle-orm/neon-http');
  
  // We use the DATABASE_URL from production (e.g., the serverless one)
  sql = neon(process.env.DATABASE_URL);
  db = drizzleHttp(sql);
}

export { db, sql };