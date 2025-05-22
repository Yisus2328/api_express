const express = require('express');
const mysql = require('mysql2'); // <--- ¡Importante! Volvemos a 'mysql2' sin '/promise'
const bodyParser = require('body-parser');
const cors = require('cors');


const app = express();
const PORT = process.env.PORT || 3301;

app.use(cors()); // Usa cors antes de definir tus rutas
app.use(bodyParser.json());

//Para instalar las dependencas:
// cd api_express_ferre
// npm install
// node server.js


async function initializeApp() {
    try {
        // Conexión a la base de datos usando el callback (modo tradicional)
        const connection = mysql.createConnection({
            host: '127.0.0.1',
            user: 'root',
            password: 'ichigoken28',
            database: 'ferremax'
        });

        // Hacemos que la conexión base esté disponible
        db = connection;

        // Y creamos una versión de la conexión que soporte promesas para el await
        dbPromise = connection.promise();

        // Puedes usar el método .connect con un callback para ver si la conexión fue exitosa
        await new Promise((resolve, reject) => {
            connection.connect((err) => {
                if (err) {
                    return reject(err);
                }
                console.log('Conectado a la base de datos MySQL');
                resolve();
            });
        });


        app.get('/', (req, res) => {
            res.send('API de Clientes');
        });

        //Agregar
        app.post('/clientes', (req, res) => {
            const { rut, nombre, email, contraseña, telefono, direccion } = req.body;


            if (!rut || !nombre || !email || !contraseña) {
                return res.status(400).json({ error: 'Por favor, proporciona rut, nombre, email y contraseña.' });
            }

            const query = 'INSERT INTO cliente (rut, nombre, email, contraseña, telefono, direccion) VALUES (?, ?, ?, ?, ?, ?)';

            db.query(query, [rut, nombre, email, contraseña, telefono, direccion], (err, result) => {
                if (err) {
                    console.error('Error al agregar cliente:', err);
                    return res.status(500).json({ error: 'Error al guardar el cliente en la base de datos.' });
                }

                res.status(201).json({ message: 'Cuenta creada exitosamente, redirigiendo al login.', rut: rut });
            });
        });


        //Eliminar
        app.delete('/clientes/:rut', (req, res) => {
            const rutToDelete = req.params.rut;

            if (!rutToDelete) {
                return res.status(400).json({ error: 'Por favor, proporciona el RUT del cliente a eliminar.' });
            }

            const query = 'DELETE FROM cliente WHERE rut = ?';

            db.query(query, [rutToDelete], (err, result) => {
                if (err) {
                    console.error('Error al eliminar cliente:', err);
                    return res.status(500).json({ error: 'Error al eliminar el cliente de la base de datos.' });
                }

                if (result.affectedRows === 0) {
                    return res.status(404).json({ message: 'No se encontró ningún cliente con el RUT proporcionado.' });
                }

                res.json({ message: `Cliente con RUT ${rutToDelete} eliminado exitosamente.` });
            });
        });

        //Actualizar
        app.put('/clientes/:rut', (req, res) => {
            const rutToUpdate = req.params.rut;
            const { email, contraseña, telefono, direccion } = req.body;

            if (!rutToUpdate) {
                return res.status(400).json({ error: 'Por favor, proporciona el RUT del cliente a actualizar.' });
            }


            if (!email && !contraseña && !telefono && !direccion) {
                return res.status(400).json({ error: 'Por favor, proporciona al menos un campo para actualizar (email, contraseña, telefono, direccion).' });
            }

            let query = 'UPDATE cliente SET ';
            const updates = [];
            const values = [];

            if (email) {
                updates.push('email = ?');
                values.push(email);
            }
            if (contraseña) {
                updates.push('contraseña = ?');
                values.push(contraseña);
            }
            if (telefono) {
                updates.push('telefono = ?');
                values.push(telefono);
            }
            if (direccion) {
                updates.push('direccion = ?');
                values.push(direccion);
            }

            query += updates.join(', ');
            query += ' WHERE rut = ?';
            values.push(rutToUpdate);

            db.query(query, values, (err, result) => {
                if (err) {
                    console.error('Error al actualizar cliente:', err);
                    return res.status(500).json({ error: 'Error al actualizar el cliente en la base de datos.' });
                }

                if (result.affectedRows === 0) {
                    return res.status(404).json({ message: 'No se encontró ningún cliente con el RUT proporcionado para actualizar.' });
                }

                res.json({ message: `Cliente con RUT ${rutToUpdate} actualizado exitosamente.` });
            });
        });

        //Buscar por rut
        app.get('/clientes/:rut', (req, res) => {
            const rutToSearch = req.params.rut;

            if (!rutToSearch) {
                return res.status(400).json({ error: 'Por favor, proporciona el RUT del cliente a buscar.' });
            }

            const query = 'SELECT rut, nombre, email, telefono, direccion FROM cliente WHERE rut = ?';

            db.query(query, [rutToSearch], (err, results) => {
                if (err) {
                    console.error('Error al buscar cliente:', err);
                    return res.status(500).json({ error: 'Error al buscar el cliente en la base de datos.' });
                }

                if (results.length === 0) {
                    return res.status(404).json({ message: 'No se encontró ningún cliente con el RUT proporcionado.' });
                }

                res.json(results[0]); 
            });
        });

        //Login 
        app.post('/login', async (req, res) => {
            const { email, contraseña } = req.body;

            if (!email || !contraseña) {
                return res.status(400).json({ error: 'Por favor, proporciona correo electrónico y contraseña.' });
            }

            const query = 'SELECT rut, nombre, email, contraseña FROM cliente WHERE email = ?';

            db.query(query, [email], async (err, results) => {
                if (err) {
                    console.error('Error al buscar usuario:', err);
                    return res.status(500).json({ error: 'Error al iniciar sesión.' });
                }

                if (results.length === 0) {
                    return res.status(401).json({ error: 'Credenciales inválidas.' });
                }

                const user = results[0];

                // Comparación de contraseñas en TEXTO PLANO (¡NO RECOMENDADO PARA PRODUCCIÓN!)
                if (contraseña === user.contraseña) {
                    res.json({ message: 'Inicio de sesión exitoso.', rut: user.rut, nombre: user.nombre, email: user.email });
                } else {
                    res.status(401).json({ error: 'Credenciales inválidas.' });
                }
            });
        });


        //Login trabajadores
        app.post('/login/trabajadores', async (req, res) => {
            const { id_trabajador, rut_trabajador } = req.body;

            if (!id_trabajador || !rut_trabajador) {
                return res.status(400).json({ success: false, message: 'ID de trabajador y RUT son requeridos.' });
            }

            const rutRegex = /^\d{1,2}\.\d{3}\.\d{3}-\w{1}$/;
            if (!rutRegex.test(rut_trabajador)) {
                return res.status(400).json({ success: false, message: 'Formato de RUT incorrecto. Debe ser como 12.345.678-9.' });
            }

            let tableName;
            let idColumnName;
            let rolPrefix = id_trabajador.substring(0, 2).toUpperCase();

            switch (rolPrefix) {
                case 'CO':
                    tableName = 'contador';
                    idColumnName = 'id_contador';
                    break;
                case 'BO':
                    tableName = 'bodeguero';
                    idColumnName = 'id_bodeguero';
                    break;
                case 'VE':
                    tableName = 'vendedor';
                    idColumnName = 'id_vendedor';
                    break;
                default:
                    return res.status(401).json({ success: false, message: 'ID de trabajador o RUT incorrecto.' });
            }

            try {
                const query = `SELECT \`${idColumnName}\`, \`rut\` FROM \`${tableName}\` WHERE \`${idColumnName}\` = ? AND \`rut\` = ?;`;

                console.log(`Ejecutando consulta SQL: ${query}`);
                console.log(`Con parámetros: [${id_trabajador}, ${rut_trabajador}]`);

                
                const [results] = await dbPromise.query(query, [id_trabajador, rut_trabajador]);
                const trabajadorEncontrado = results.length > 0 ? results[0] : null;

                if (trabajadorEncontrado) {
                    let redirectUrl = '/index/';

                    switch (rolPrefix) {
                        case 'CO':
                            redirectUrl = '/contadores/dashboard/';
                            break;
                        case 'BO':
                            redirectUrl = '/bodegueros/inventario/';
                            break;
                        case 'VE':
                            redirectUrl = '/vendedores/ventas/';
                            break;
                    }

                    return res.status(200).json({
                        success: true,
                        message: `Bienvenido, ${id_trabajador}!`,
                        redirect_url: redirectUrl
                    });

                } else {
                    return res.status(401).json({ success: false, message: 'ID de trabajador o RUT incorrecto.' });
                }

            } catch (error) {
                console.error('Error al procesar la solicitud de login o al consultar la BD:', error);
                return res.status(500).json({ success: false, message: 'Error interno del servidor. Por favor, intenta de nuevo más tarde.' });
            }
        });


        //Login admin
        app.post('/login/admin', async (req, res) => {
            const { id, email, contraseña } = req.body; 

            if (!id || !email || !contraseña) {
                return res.status(400).json({ success: false, message: 'ID, email y contraseña son requeridos.' });
            }

            
            const tableName = 'administrador';
            const idColumnName = 'id_admin'; 

            try {
                const query = `SELECT \`${idColumnName}\`, \`email\`, \`contraseña\` FROM \`${tableName}\` WHERE \`${idColumnName}\` = ? AND \`email\` = ?;`;

                console.log(`Ejecutando consulta SQL para admin: ${query}`);
                console.log(`Con parámetros: [${id}, ${email}]`);

                const [results] = await dbPromise.query(query, [id, email]); 

                if (results.length === 0) {
                    return res.status(401).json({ success: false, message: 'Credenciales inválidas (ID o email no encontrado).' });
                }

                const admin = results[0];

                
                if (contraseña === admin.contraseña) {
                    
                    return res.status(200).json({
                        success: true,
                        message: `Bienvenido, Administrador ${id}!`,
                        redirect_url: '/panel_ad/' 
                    });
                } else {
                    return res.status(401).json({ success: false, message: 'Credenciales inválidas (contraseña incorrecta).' });
                }

            } catch (error) {
                console.error('Error al procesar la solicitud de login de admin o al consultar la BD:', error);
                return res.status(500).json({ success: false, message: 'Error interno del servidor. Por favor, intenta de nuevo más tarde.' });
            }
        });

        //creacion empleados

        app.post('/empleados/agregar', async (req, res) => {
            
            const { id, rut, nombre, email, contraseña, id_sucursal } = req.body;

            if (!id || !rut || !nombre || !email || !contraseña || !id_sucursal) {
                return res.status(400).json({ success: false, message: 'Faltan campos obligatorios para agregar el empleado, incluyendo el ID.' });
            }

            
            let tipoEmpleado;
            let tableName;
            let idColumnName;
            const idPrefix = id.substring(0, 2).toUpperCase(); 

            switch (idPrefix) {
                case 'CO':
                    tipoEmpleado = 'contador';
                    tableName = 'contador';
                    idColumnName = 'id_contador';
                    break;
                case 'BO':
                    tipoEmpleado = 'bodeguero';
                    tableName = 'bodeguero';
                    idColumnName = 'id_bodeguero';
                    break;
                case 'VE':
                    tipoEmpleado = 'vendedor';
                    tableName = 'vendedor';
                    idColumnName = 'id_vendedor';
                    break;
                default:
                    return res.status(400).json({ success: false, message: 'Prefijo de ID de empleado inválido. Debe ser CO, BO o VE.' });
            }

             try {
                
                const [existing] = await dbPromise.query(`SELECT \`${idColumnName}\` FROM \`${tableName}\` WHERE \`${idColumnName}\` = ?`, [id]);
                if (existing.length > 0) {
                    return res.status(409).json({ success: false, message: `Error: El ID '${id}' ya existe para un ${tipoEmpleado}.` });
                }
                
                
                const insertQuery = `INSERT INTO \`${tableName}\` (\`${idColumnName}\`, rut, nombre, email, contraseña, id_sucursal) VALUES (?, ?, ?, ?, ?, ?);`;
                await dbPromise.query(insertQuery, [id, rut, nombre, email, contraseña, id_sucursal]);

                res.status(201).json({
                    success: true,
                    message: `Empleado ${nombre} agregado exitosamente como ${tipoEmpleado}. ID: ${id}`,
                    id_empleado_generado: id 
                });

        } catch (error) {
            console.error('Error al agregar empleado:', error);

            if (error.code === 'ER_DUP_ENTRY') {
                let message = 'Error: Datos duplicados. Es posible que el RUT o Email ya estén registrados.';
                if (error.message.includes('rut')) {
                    message = 'Error: El RUT ya está registrado.';
                } else if (error.message.includes('email')) {
                    message = 'Error: El Email ya está registrado.';
                }
                return res.status(409).json({ success: false, message: message });
            } else if (error.errno === 1452) { // <-- ¡Asegúrate de que este bloque exista!
                return res.status(400).json({ success: false, message: 'Error de clave foránea: El ID de sucursal proporcionado no existe en la tabla de sucursales o no coincide.' });
            }
            res.status(500).json({ success: false, message: 'Error interno del servidor al agregar el empleado. Por favor, intenta de nuevo más tarde.' });
        }
        });


        
        app.listen(PORT, () => {
            console.log(`API Express corriendo en http://localhost:${PORT}`);
        });

    }catch (err) {
        console.error('Error FATAL al iniciar el servidor o conectar a la base de datos:', err);
        process.exit(1); 
    }
}

initializeApp();