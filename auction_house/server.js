require('dotenv').config();
const express = require('express');
const { neon } = require('@neondatabase/serverless');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
require('dotenv').config();
console.log("DATABASE_URL:", process.env.DATABASE_URL);


// Conectar con la base de datos Neon
const sql = neon(process.env.DATABASE_URL);

app.get('/', async (req, res) => {
    try {
        const searchQuery = req.query.search || ''; // Definir searchQuery por defecto

        const connectedRealms = await sql`SELECT * FROM connected_realms`;
        let realms;

        if (searchQuery) {
            realms = await sql`SELECT * FROM realms WHERE name ILIKE ${'%' + searchQuery + '%'}`;
        } else {
            realms = await sql`SELECT * FROM realms`;
        }

        res.render('index', { connectedRealms, realms, searchQuery }); // 🔹 Pasamos searchQuery
    } catch (error) {
        console.error('Error al obtener datos:', error);
        res.status(500).send('Error en la base de datos');
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
