const { Client } = require("pg");
const fs = require("fs");

// 🔹 Conexión a Neon PostgreSQL
const client = new Client({
  connectionString: "postgresql://neondb_owner:npg_YeGnytcP25dk@ep-flat-cherry-a818dp48-pooler.eastus2.azure.neon.tech/neondb?sslmode=require",
  ssl: { rejectUnauthorized: false },
});

async function saveData() {
  try {
    // 🔹 Conectar a Neon PostgreSQL
    await client.connect();
    console.log("✅ Conectado a Neon PostgreSQL");

    // 🔹 Leer el archivo JSON
    const jsonData = fs.readFileSync("resultados.json", "utf8");
    const data = JSON.parse(jsonData);

    // 🔹 Buscar la variable 'all_responses' dentro del JSON
    let allResponses = [];
    if (data.environment?.values) {
      const allResponsesEntry = data.environment.values.find(entry => entry.key === "all_responses");
      if (allResponsesEntry) {
        allResponses = JSON.parse(allResponsesEntry.value);
      }
    }

    if (allResponses.length === 0) {
      console.log("⚠ No se encontraron datos en 'all_responses'.");
      return;
    }

    // 🔹 Query para insertar o actualizar connected_realms
    const connectedRealmQuery = `
      INSERT INTO connected_realms (id, status, population)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE 
      SET status = EXCLUDED.status, population = EXCLUDED.population;
    `;

    // 🔹 Query para insertar o actualizar realms
    const realmInsertQuery = `
      INSERT INTO realms (id, connected_realm_id, name, category, timezone, slug, region_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE 
      SET name = EXCLUDED.name, 
          category = EXCLUDED.category, 
          timezone = EXCLUDED.timezone, 
          slug = EXCLUDED.slug, 
          region_id = EXCLUDED.region_id;
    `;

    let insertedRealms = 0;

    // 🔹 Insertar todos los connected_realms y realms
    for (const realmData of allResponses) {
      try {
        await client.query(connectedRealmQuery, [
          realmData.id, 
          realmData.status?.type || 'unknown', 
          realmData.population?.type || 'unknown'
        ]);

        for (const realm of realmData.realms) {
          await client.query(realmInsertQuery, [
            realm.id,
            realmData.id,
            realm.name || "Unknown",
            realm.category || "Unknown",
            realm.timezone || "Unknown",
            realm.slug || "Unknown",
            realm.region?.id || null
          ]);
          insertedRealms++;
        }
      } catch (error) {
        console.error(`❌ Error al insertar realm_id ${realmData.id}:`, error.message);
      }
    }

    console.log(`✅ Se insertaron/actualizaron ${insertedRealms} reinos en PostgreSQL (Neon)`);

  } catch (error) {
    console.error("❌ Error general en el proceso:", error);
  } finally {
    await client.end();
    console.log("🔹 Conexión cerrada.");
  }
}

// 🔹 Ejecutar la función
saveData();
