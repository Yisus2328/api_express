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

        //APARTADO DE CLIENTES//
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


        //APARTADO DE TRABAJADORES//
        //Login trabajadores
        app.post('/login/trabajadores', async (req, res) => {
            const { id, email, contraseña } = req.body; // <-- Cambiado aquí para esperar email y contraseña

            if (!id || !email || !contraseña) { // <-- Validación para los tres campos
                return res.status(400).json({ success: false, message: 'ID de trabajador, email y contraseña son requeridos.' });
            }

            // Validación de formato de email en el backend también es buena práctica
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ success: false, message: 'Formato de email incorrecto.' });
            }

            let tableName;
            let idColumnName;
            // Asume que las tablas de trabajadores tienen una columna 'email' y 'contraseña'
            let emailColumnName = 'email'; 
            let passwordColumnName = 'contraseña'; 

            let rolPrefix = id.substring(0, 2).toUpperCase(); // Usa 'id' que viene del body

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
                    return res.status(401).json({ success: false, message: 'ID de trabajador incorrecto.' });
            }

            try {
                // Consulta para verificar ID, email Y contraseña
                const query = `SELECT \`${idColumnName}\`, \`${emailColumnName}\`, \`${passwordColumnName}\` FROM \`${tableName}\` WHERE \`${idColumnName}\` = ? AND \`${emailColumnName}\` = ?;`;

                console.log(`Ejecutando consulta SQL para trabajador: ${query}`);
                console.log(`Con parámetros: [${id}, ${email}]`);

                const [results] = await dbPromise.query(query, [id, email]);
                const trabajadorEncontrado = results.length > 0 ? results[0] : null;

                if (trabajadorEncontrado) {
                    // NOTA DE SEGURIDAD CRÍTICA: LAS CONTRASEÑAS DEBEN ESTAR HASHED EN LA BASE DE DATOS
                    // Y VERIFICADAS CON UNA LIBRERÍA COMO 'bcrypt'.
                    // ESTA ES UNA COMPARACIÓN DE TEXTO PLANO Y NO ES SEGURA PARA PRODUCCIÓN.
                    if (contraseña === trabajadorEncontrado.contraseña) { // <-- Compara la contraseña
                        let redirectUrl; // No inicializar con '/index/' aquí, se define por rol

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
                            // Default no es necesario aquí porque ya se manejó arriba.
                        }

                        return res.status(200).json({
                            success: true,
                            message: `Bienvenido, ${id}!`,
                            redirect_url: redirectUrl
                        });
                    } else {
                        return res.status(401).json({ success: false, message: 'Credenciales inválidas (contraseña incorrecta).' });
                    }
                } else {
                    return res.status(401).json({ success: false, message: 'Credenciales inválidas (ID o email no encontrado).' });
                }

            } catch (error) {
                console.error('Error al procesar la solicitud de login de trabajador o al consultar la BD:', error);
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


        //APARTADO DE PEDIDOS//
        // Endpoint para obtener pedidos con estado 'pagado'
        // Este endpoint reemplaza o complementa al anterior /pedidos/pagados
        async function getPedidosByEstado(estado) {
            if (!dbPromise) {
                throw new Error('Conexión a la base de datos no establecida.');
            }
            const query = `
                SELECT
                    p.id_pedido,
                    p.fecha,
                    p.estado,
                    p.tipo_entrega,
                    p.direccion_entrega,
                    p.id_bodeguero,
                    p.rut,
                    p.id_vendedor
                FROM
                    PEDIDO p
                WHERE p.estado = ?
                ORDER BY
                    p.fecha DESC;
            `;
            const [rows] = await dbPromise.query(query, [estado]);
            return rows;
        }

        // Endpoint para obtener pedidos con estado 'Pagado'
        app.get('/pedidos/pagados', async (req, res) => {
            try {
                const pedidos = await getPedidosByEstado('Pagado');
                return res.status(200).json({
                    success: true,
                    pedidos: pedidos,
                    message: 'Pedidos pagados obtenidos exitosamente.'
                });
            } catch (error) {
                console.error('Error al obtener pedidos pagados:', error);
                return res.status(500).json({ success: false, message: 'Error interno del servidor al obtener pedidos pagados.', details: error.message });
            }
        });

        // Endpoint para obtener pedidos con estado 'En Preparacion'
        app.get('/pedidos/en-preparacion', async (req, res) => {
            try {
                const pedidos = await getPedidosByEstado('En Preparacion');
                return res.status(200).json({
                    success: true,
                    pedidos: pedidos,
                    message: 'Pedidos en preparación obtenidos exitosamente.'
                });
            } catch (error) {
                console.error('Error al obtener pedidos en preparación:', error);
                return res.status(500).json({ success: false, message: 'Error interno del servidor al obtener pedidos en preparación.', details: error.message });
            }
        });

        // Endpoint para obtener pedidos con estado 'Preparado'
        app.get('/pedidos/preparados', async (req, res) => {
            try {
                const pedidos = await getPedidosByEstado('Preparado');
                return res.status(200).json({
                    success: true,
                    pedidos: pedidos,
                    message: 'Pedidos preparados obtenidos exitosamente.'
                });
            } catch (error) {
                console.error('Error al obtener pedidos preparados:', error);
                return res.status(500).json({ success: false, message: 'Error interno del servidor al obtener pedidos preparados.', details: error.message });
            }
        });

        // Endpoint para actualizar el estado del pedido por el bodeguero (este se mantiene igual)
        app.put('/pedidos/:id/actualizar_estado_bodeguero', async (req, res) => {
            const { id } = req.params;
            const { nuevo_estado } = req.body;

            if (!id || !nuevo_estado) {
                return res.status(400).json({ success: false, message: 'ID de pedido o nuevo estado no proporcionado.' });
            }

            const estadosPermitidos = ['En Preparacion', 'Preparado'];
            if (!estadosPermitidos.includes(nuevo_estado)) {
                return res.status(400).json({ success: false, message: 'Estado no válido para la actualización del bodeguero. Estados permitidos: "En Preparacion", "Preparado".' });
            }

            try {
                if (!dbPromise) {
                    throw new Error('Conexión a la base de datos no establecida.');
                }

                const [existingPedido] = await dbPromise.query('SELECT estado FROM PEDIDO WHERE id_pedido = ?', [id]);
                if (existingPedido.length === 0) {
                    return res.status(404).json({ success: false, message: 'Pedido no encontrado.' });
                }

                const estadoActual = existingPedido[0].estado;

                let isValidTransition = false;
                if (estadoActual === 'Pagado' && nuevo_estado === 'En Preparacion') {
                    isValidTransition = true;
                } else if (estadoActual === 'En Preparacion' && nuevo_estado === 'Preparado') {
                    isValidTransition = true;
                }

                if (!isValidTransition) {
                    return res.status(400).json({ success: false, message: `Transición de estado inválida de '${estadoActual}' a '${nuevo_estado}'.` });
                }

                const updateQuery = `UPDATE PEDIDO SET estado = ? WHERE id_pedido = ?`;
                const [result] = await dbPromise.query(updateQuery, [nuevo_estado, id]);

                if (result.affectedRows === 0) {
                    return res.status(404).json({ success: false, message: 'Pedido no encontrado o no se pudo actualizar.' });
                }

                return res.status(200).json({
                    success: true,
                    message: `Pedido ${id} actualizado a '${nuevo_estado}' exitosamente.`,
                    nuevo_estado: nuevo_estado
                });
            } catch (error) {
                console.error('Error al actualizar estado del pedido por bodeguero:', error);
                return res.status(500).json({ success: false, message: 'Error interno del servidor al actualizar estado del pedido.', details: error.message });
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