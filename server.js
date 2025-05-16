const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');

//Para instalar las dependencas:
// cd api_express_ferre
// npm install
// node server.js

const app = express();
const PORT = process.env.PORT || 3306;


app.use(bodyParser.json());


const db = mysql.createConnection({
    host: '127.0.0.1',      
    user: 'root',     
    password: 'ichigoken28', 
    database: 'ferremax' 
});


db.connect((err) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err);
        return;
    }
    console.log('Conectado a la base de datos MySQL');
});


app.get('/', (req, res) => {
    res.send('API de Clientes');
});


app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});