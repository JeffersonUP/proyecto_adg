const { Client } = require("pg");
const fetch = require("node-fetch");

// 🔹 Conexión a Neon PostgreSQL
const client = new Client({
  connectionString: "postgresql://neondb_owner:npg_YeGnytcP25dk@ep-flat-cherry-a818dp48-pooler.eastus2.azure.neon.tech/neondb?sslmode=require",
  ssl: { rejectUnauthorized: false },
});

// 🔹 Configuración de autenticación de Blizzard API
const CLIENT_ID = "508a15935a30496eb1c47ffe5cee3a03";  
const CLIENT_SECRET = "n1tGP5M0Cqfx9RXk3idO7IRjL64nMEE9";  

const TOKEN_URL = "https://oauth.battle.net/token";
const REALM_URL = "https://us.api.blizzard.com/data/wow/connected-realm/index?namespace=dynamic-us&locale=en_US";
const AUCTION_URL = "https://us.api.blizzard.com/data/wow/connected-realm/{realm_id}/auctions?namespace=dynamic-us";

// 🔹 Variable para el accessToken
let accessToken = "";

// 🔹 Ítems a buscar con sus imágenes
const itemData = {
    225728: { label: "Acidic Attendant's Loop", image: "https://render.worldofwarcraft.com/us/icons/56/inv_11_0_nerubian_ring_02_color3.jpg", slot: "Finger" },
    225720: { label: "Web Acolyte's Hood", image: "https://render.worldofwarcraft.com/us/icons/56/inv_cloth_raidpriestnerubian_d_01_helm.jpg", slot: "Cloth Helm" },
    225721: { label: "Prime Slime Slippers", image: "https://render.worldofwarcraft.com/us/icons/56/inv_cloth_raidpriestnerubian_d_01_boot.jpg", slot: "Cloth Boots" },
    225722: { label: "Adorned Lynxborne Pauldrons", image: "https://render.worldofwarcraft.com/us/icons/56/inv_shoulder_leather_raiddruidnerubian_d_01.jpg", slot: "Leather Shoulders" },
    225723: { label: "Venom Stalker's Strap", image: "https://render.worldofwarcraft.com/us/icons/56/inv_belt_leather_raiddruidnerubian_d_01.jpg", slot: "Leather Waist" },
    225724: { label: "Shrillwing Hunter's Prey", image: "https://render.worldofwarcraft.com/us/icons/56/inv_mail_raidhunternerubian_d_01_shoulder.jpg", slot: "Mail Shoulders" },
    225725: { label: "Lurking Marauder's Binding", image: "https://render.worldofwarcraft.com/us/icons/56/inv_belt_mail_raidshamannerubian_d_01.jpg", slot: "Mail Waist" },
    225727: { label: "Captured Earthen's Ironhorns", image: "https://render.worldofwarcraft.com/us/icons/56/inv_helm_plate_raidwarriornerubian_d_01.jpg", slot: "Plate Helm" },
    225744: { label: "Heritage Militia's Stompers", image: "https://render.worldofwarcraft.com/us/icons/56/inv_boot_plate_raidwarriornerubian_d_01.jpg", slot: "Plate Boots" }
};

// 🔹 Obtener el access_token
async function getToken() {
    const response = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "client_credentials",
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET
        })
    });

    const data = await response.json();
    accessToken = data.access_token;
    console.log("✅ Access Token obtenido");
}

// 🔹 Obtener lista de `realm_id`
async function getRealmIds() {
    const response = await fetch(REALM_URL, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        }
    });

    const data = await response.json();
    return data.connected_realms.map(realm => {
        const match = realm.href.match(/connected-realm\/(\d+)\?/);
        return match ? match[1] : null;
    }).filter(id => id !== null);
}

// 🔹 Obtener y guardar datos de los `realms`
async function saveRealms(realmIds) {
    console.log("🔄 Guardando reinos...");

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

    for (const realmId of realmIds) {
        await client.query(realmInsertQuery, [
            realmId, realmId, `Realm ${realmId}`, "Unknown", "Unknown", `slug-${realmId}`, null
        ]);
    }

    console.log(`✅ Se insertaron/actualizaron ${realmIds.length} reinos.`);
}

// 🔹 Obtener subastas y guardarlas en `items`
async function getAuctionsForRealm(realmId) {
    const url = AUCTION_URL.replace("{realm_id}", realmId);
    
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            console.error(`❌ Error al obtener subastas del realm ${realmId}:`, response.statusText);
            return;
        }

        const data = await response.json();

        if (!data || !data.auctions) {
            console.log(`⚠ No hay datos de subastas para el realm ${realmId}.`);
            return;
        }

        // Filtrar subastas de los ítems buscados
        const filteredAuctions = data.auctions.filter(auction => 
            auction.item && itemData[auction.item.id]
        );

        if (filteredAuctions.length > 0) {
            console.log(`✅ Subastas encontradas en Realm ${realmId}. Guardando en la base de datos...`);
            await saveItems(realmId, filteredAuctions);
        } else {
            console.log(`⚠ No se encontraron subastas en Realm ${realmId}.`);
        }
    } catch (error) {
        console.error(`❌ Error al procesar las subastas del realm ${realmId}:`, error.message);
    }
}


// 🔹 Insertar datos en `items`
async function saveItems(realmId, auctions) {
    const query = `
        INSERT INTO items (realm_id, item_id, slot, label, cant, price, image) 
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (realm_id, item_id) DO UPDATE 
        SET cant = EXCLUDED.cant, price = EXCLUDED.price;
    `;

    for (const auction of auctions) {
        const itemId = auction.item.id;
        const { label, image, slot } = itemData[itemId];

        await client.query(query, [
            realmId, itemId, slot, label, auction.quantity, auction.buyout, image
        ]);
    }

    console.log(`✅ Datos insertados para Realm ${realmId}`);
}

// 🔹 Ejecutar todo el proceso
async function ejecutarProceso() {
    try {
        await client.connect();
        await getToken();
        const realmIds = await getRealmIds();
        await saveRealms(realmIds);

        for (const realmId of realmIds) {
            await getAuctionsForRealm(realmId);
        }

        console.log("\n✅ Proceso completado.");
    } catch (error) {
        console.error("❌ Error en el proceso:", error);
    } finally {
        await client.end();
    }
}

// 🔹 Ejecutar el script
ejecutarProceso();
