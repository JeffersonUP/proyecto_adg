const { Client } = require("pg");

const client = new Client({
  connectionString: "postgresql://neondb_owner:npg_YeGnytcP25dk@ep-flat-cherry-a818dp48-pooler.eastus2.azure.neon.tech/neondb?sslmode=require",
  ssl: {
    rejectUnauthorized: false,  // Requerido para Neon
  },
});

// Probar conexión
async function testConnection() {
  try {
    await client.connect();
    console.log("✅ Conectado a Neon PostgreSQL");
    const res = await client.query("SELECT NOW();");
    console.log("📅 Fecha en el servidor:", res.rows[0].now);
  } catch (err) {
    console.error("❌ Error de conexión:", err);
  } finally {
    await client.end();
  }
}

testConnection();
