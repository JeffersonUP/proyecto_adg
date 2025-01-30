from flask import Flask, jsonify, request
import sqlite3
from flask_cors import CORS  # Para permitir peticiones desde el navegador

app = Flask(__name__)
CORS(app)  # Habilitar CORS para evitar problemas en la conexión

# Función para ejecutar consultas
def query_database(query, args=(), commit=False):
    conn = sqlite3.connect('example.db')
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(query, args)
    if commit:
        conn.commit()
        conn.close()
        return None
    rv = cur.fetchall()
    conn.close()
    return rv

# Ruta para obtener todos los usuarios
@app.route('/api/users', methods=['GET'])
def get_users():
    users = query_database("SELECT * FROM users")
    return jsonify([dict(row) for row in users])

# Ruta para agregar un nuevo usuario
@app.route('/api/users', methods=['POST'])
def add_user():
    data = request.json
    name = data.get('name')
    email = data.get('email')

    if not name or not email:
        return jsonify({"error": "Faltan datos"}), 400

    query_database("INSERT INTO users (name, email) VALUES (?, ?)", (name, email), commit=True)

    # Confirmación con los datos insertados
    return jsonify({"message": "Usuario agregado", "name": name, "email": email}), 201

if __name__ == '__main__':
    app.run(debug=True)
