const express = require("express");
const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config();
const app = express();
const port = 3000;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false }
});

app.set("view engine", "ejs");
app.use(express.static("public")); // Para servir imágenes si están en local

// Ruta principal con búsqueda de reinos
app.get("/", async (req, res) => {
    try {
        const searchQuery = req.query.search || "";
        const realmsQuery = `
            SELECT * FROM realms
            WHERE name ILIKE $1
            ORDER BY name;
        `;
        const realms = await pool.query(realmsQuery, [`%${searchQuery}%`]);

        res.render("index", { realms: realms.rows, searchQuery });
    } catch (error) {
        console.error("Error al obtener los reinos:", error);
        res.status(500).send("Error en el servidor");
    }
});

// Ruta para obtener los items de un reino específico
app.get("/reino/:id", async (req, res) => {
    try {
        const realmId = req.params.id;

        // Obtener la información del reino
        const realmQuery = "SELECT * FROM realms WHERE id = $1;";
        const realmResult = await pool.query(realmQuery, [realmId]);

        // Obtener los items asociados a ese reino
        const itemsQuery = `
            SELECT slot, label, cant, price, image FROM items
            WHERE realm_id = $1
            ORDER BY slot;
        `;
        const itemsResult = await pool.query(itemsQuery, [realmId]);

        if (realmResult.rows.length === 0) {
            return res.status(404).send("Reino no encontrado");
        }

        res.render("realm", {
            realm: realmResult.rows[0],
            items: itemsResult.rows
        });
    } catch (error) {
        console.error("Error al obtener los items:", error);
        res.status(500).send("Error en el servidor");
    }
});

app.listen(port, () => {
    console.log(`Servidor en ejecución en http://localhost:${port}`);
});
