const axios = require('axios');
const qs = require('qs');
const fs = require('fs');
const path = require('path');

// Configuración de autenticación
const CLIENT_ID = "508a15935a30496eb1c47ffe5cee3a03"; 
const CLIENT_SECRET = "n1tGP5M0Cqfx9RXk3idO7IRjL64nMEE9"; 

// URLs de Blizzard API
const TOKEN_URL = "https://oauth.battle.net/token";
const ITEM_URL = "https://us.api.blizzard.com/data/wow/item/{itemId}?namespace=static-us";

// Variable para guardar el token
let accessToken = "";

// Lista de ítems a buscar
const itemNames = [
    "Acidic Attendant's Loop",
    "Web Acolyte's Hood",
    "Prime Slime Slippers",
    "Adorned Lynxborne Pauldrons",
    "Venom Stalker's Strap",
    "Shrillwing Hunter's Prey",
    "Lurking Marauder's Binding",
    "Captured Earthen's Ironhorns",
    "Heritage Militia's Stompers"
];

// Función para obtener el token de acceso
async function getAccessToken() {
    const data = qs.stringify({ grant_type: 'client_credentials' });

    const config = {
        method: 'post',
        url: TOKEN_URL,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        auth: {
            username: CLIENT_ID,
            password: CLIENT_SECRET,
        },
        data: data,
    };

    try {
        const response = await axios(config);
        accessToken = response.data.access_token;
        console.log('Token obtenido:', accessToken);
    } catch (error) {
        console.error('Error al obtener el token:', error);
    }
}

// Función para obtener detalles de un ítem
async function getItemDetails(itemId) {
    const url = ITEM_URL.replace('{itemId}', itemId);

    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            params: {
                locale: 'en_US'
            }
        });
        return response.data;
    } catch (error) {
        console.error(`Error al obtener detalles del ítem ${itemId}:`, error.response?.data || error.message);
    }
}

// Función principal
async function main() {
    await getAccessToken();

    // Cargar el archivo JSON
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'subastas', 'subasta_4.json'), 'utf-8'));

    // Extraer los IDs de los ítems
    const itemIds = new Set();
    for (const auction of data.auctions) {
        const itemId = auction.item?.id;
        if (itemId) {
            itemIds.add(itemId);
        }
    }

    // Consultar detalles de cada ítem y filtrar por nombre
    for (const itemId of itemIds) {
        const itemDetails = await getItemDetails(itemId);

        // Verifica si el nombre del ítem está en la lista de búsqueda
        if (itemDetails && itemNames.includes(itemDetails.name)) {
            console.log(`\nÍtem encontrado: ${itemDetails.name}`);
            console.log(`ID: ${itemDetails.id}`);
            console.log(`Nivel de Ítem: ${itemDetails.level}`);
            console.log(`Tipo: ${itemDetails.item_class.name} - ${itemDetails.item_subclass.name}`);

            // Mostrar los niveles de dificultad
            console.log("Niveles de dificultad:");
            console.log("LFR: 590");
            console.log("Normal: 603");
            console.log("Heroic: 616");
            console.log("Mythic: 629");
        }
    }
}

main();
