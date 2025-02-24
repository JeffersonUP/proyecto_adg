const fs = require("fs");
const fetch = require("node-fetch");

// Configuración de autenticación
const CLIENT_ID = "508a15935a30496eb1c47ffe5cee3a03";  // Tu client ID de Blizzard
const CLIENT_SECRET = "n1tGP5M0Cqfx9RXk3idO7IRjL64nMEE9";  // Tu client secret de Blizzard

// URLs de Blizzard API
const TOKEN_URL = "https://oauth.battle.net/token";
const REALM_URL = "https://us.api.blizzard.com/data/wow/connected-realm/index?namespace=dynamic-us&locale=en_US";
const AUCTION_URL = "https://us.api.blizzard.com/data/wow/connected-realm/{realm_id}/auctions?namespace=dynamic-us";

// Variable para guardar el token
let accessToken = "";

// 1. Obtener el access_token
async function getToken() {
    const response = await fetch(TOKEN_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
            grant_type: "client_credentials",
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET
        })
    });

    const data = await response.json();
    accessToken = data.access_token;
    console.log("✅ Access Token obtenido: ", accessToken);
}

// 2. Obtener la lista de realm_ids
async function getRealmIds() {
    const response = await fetch(REALM_URL, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        }
    });

    const data = await response.json();
    const realmIds = data.connected_realms.map(realm => {
        const match = realm.href.match(/connected-realm\/(\d+)\?/);
        return match ? match[1] : null;
    }).filter(id => id !== null);

    console.log("✅ Realm IDs obtenidos: ", realmIds);
    
    // Guardar la lista en realm_ids.json
    fs.writeFileSync("realm_ids.json", JSON.stringify(realmIds, null, 2));
    return realmIds;
}

// 3. Obtener subastas para cada realm_id
async function getAuctionsForRealm(realmId) {
    const url = AUCTION_URL.replace("{realm_id}", realmId);

    const response = await fetch(url, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        }
    });

    const data = await response.json();

    // Guardar en un archivo separado
    const filePath = `nodejs/subastas/subasta_${realmId}.json`;
    fs.mkdirSync("nodejs/subastas", { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ Archivo guardado: ${filePath}`);
}

// 4. Ejecutar el flujo completo
async function ejecutarProceso() {
    try {
        // Obtener el access token
        await getToken();

        // Obtener la lista de realm_ids
        const realmIds = await getRealmIds();

        // Obtener las subastas para cada realm_id
        for (const realmId of realmIds) {
            console.log(`🔄 Obteniendo subastas para el reino: ${realmId}`);
            await getAuctionsForRealm(realmId);
        }

        console.log("✅ Proceso completado.");
    } catch (error) {
        console.error("❌ Error en el proceso:", error);
    }
}

// Ejecutar el proceso
ejecutarProceso();
