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

        db = connection;

        dbPromise = connection.promise();

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
            // 1. Ya no pedimos 'id' en el body de la petición
            const { email, contraseña } = req.body; 

            // 2. Validar que email y contraseña son requeridos
            if (!email || !contraseña) {
                return res.status(400).json({ success: false, message: 'Email y contraseña son requeridos.' });
            }

            // Validación de formato de email en el backend (buena práctica, la mantenemos)
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ success: false, message: 'Formato de email incorrecto.' });
            }

            // Definir las tablas de trabajadores a buscar
            const workerTables = {
                'contador': 'CO',
                'bodeguero': 'BO',
                'vendedor': 'VE'
            };

            let trabajadorEncontrado = null;
            let trabajadorRol = null;
            let trabajadorId = null; // Para poder retornar el ID en la respuesta si es necesario

            try {
                // 3. Iterar sobre cada tabla de trabajadores para buscar por email y contraseña
                for (const tableName in workerTables) {
                    const query = `SELECT * FROM \`${tableName}\` WHERE \`email\` = ? AND \`contraseña\` = ?;`; // Asumiendo 'contraseña' es el nombre de la columna

                    console.log(`Intentando login en tabla: ${tableName} con email: ${email}`);
                    
                    const [results] = await dbPromise.query(query, [email, contraseña]); // Pasamos email y contraseña

                    if (results.length > 0) {
                        trabajadorEncontrado = results[0];
                        trabajadorRol = workerTables[tableName]; // Obtenemos el prefijo del rol
                        // Dependiendo de tu esquema, el ID se llamará 'id_contador', 'id_bodeguero', etc.
                        // Accedemos a la clave que corresponde al ID de esa tabla específica
                        trabajadorId = trabajadorEncontrado[`id_${tableName}`]; 
                        break; // Encontramos al trabajador, salimos del bucle
                    }
                }

                if (trabajadorEncontrado) {
                    // Si llegamos aquí, significa que el email y la contraseña coincidieron en alguna tabla
                    let redirectUrl; 

                    switch (trabajadorRol) {
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
                        message: `Bienvenido, ${trabajadorEncontrado.nombre}!`, // Puedes usar el nombre del trabajador
                        redirect_url: redirectUrl,
                        user_id: trabajadorId, // Opcional: para que el frontend sepa el ID
                        user_rol: trabajadorRol // Opcional: para que el frontend sepa el rol
                    });
                } else {
                    // Si el bucle terminó y no se encontró el trabajador
                    return res.status(401).json({ success: false, message: 'Credenciales inválidas (email o contraseña incorrectos).' });
                }

            } catch (error) {
                console.error('Error al procesar la solicitud de login de trabajador o al consultar la BD:', error);
                return res.status(500).json({ success: false, message: 'Error interno del servidor. Por favor, intenta de nuevo más tarde.' });
            }
        });



        //Login admin
        app.post('/login/admin', async (req, res) => {
            // 1. Ya no esperamos 'id' en el body de la petición
            const { email, contraseña } = req.body; 

            // 2. Validación de campos de entrada: solo email y contraseña
            if (!email || !contraseña) {
                return res.status(400).json({ success: false, message: 'Email y contraseña son requeridos.' });
            }

            // Opcional: Validación de formato de email en el backend
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ success: false, message: 'Formato de email incorrecto.' });
            }

            const tableName = 'administrador';
            

            try {

                const query = `SELECT id_admin, email, contraseña, estado FROM \`${tableName}\` WHERE \`email\` = ? AND \`contraseña\` = ?;`;

                console.log(`Ejecutando consulta SQL para admin: ${query}`);
                console.log(`Con parámetros: [${email}, ${contraseña}]`); // Parámetros actualizados

       
                const [results] = await dbPromise.query(query, [email, contraseña]);


                if (results.length === 0) {
                    // Mensaje más genérico para no dar pistas sobre qué credencial falló
                    return res.status(401).json({ success: false, message: 'Credenciales inválidas (email o contraseña incorrectos).' });
                }

                const admin = results[0]; 


                
                let responseMessage = `Bienvenido, Administrador ${admin.id_admin}!`; // Usamos el ID encontrado
                let redirectUrl = '/panel_ad'; // URL por defecto

                // 6. Lógica de validación del estado del administrador en el backend
                if (admin.estado === "No_verificado") {
                    responseMessage = 'Bienvenido, lo redirigiremos para cambiar su contraseña.';
                    redirectUrl = '/admin_cambio';
                }

                // 7. Login exitoso
                return res.status(200).json({
                    success: true,
                    message: responseMessage,
                    admin: { 
                        id_admin: admin.id_admin,
                        email: admin.email,
                        estado: admin.estado
                    },
                    redirect_url: redirectUrl
                });

            } catch (error) {
                console.error('Error al procesar la solicitud de login de admin o al consultar la BD:', error);
                return res.status(500).json({ success: false, message: 'Error interno del servidor. Por favor, intenta de nuevo más tarde.' });
            }
        });


        app.post('/admin/cambiar-contrasena', async (req, res) => {
            // 1. Ahora esperamos 'email' en lugar de 'id'
            const { email, newPassword } = req.body; 

            // 2. Validaciones básicas
            if (!email || !newPassword) {
                return res.status(400).json({ success: false, message: 'Email y nueva contraseña son requeridos.' });
            }

            // Opcional: Validar formato del email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ success: false, message: 'Formato de email incorrecto.' });
            }

            // Opcional: Validar longitud de la nueva contraseña (si no se hace en frontend)
            if (newPassword.length < 6) { 
                return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres.' });
            }

            try {
                // 3. Buscar al administrador por email
                const [adminResults] = await dbPromise.query('SELECT * FROM administrador WHERE email = ?;', [email]);

                if (adminResults.length === 0) {
                    return res.status(404).json({ success: false, message: 'Administrador no encontrado con ese email.' });
                }

                const admin = adminResults[0];

                // 4. Actualizar la contraseña y el estado del administrador
                const updateQuery = `
                    UPDATE administrador
                    SET contraseña = ?, estado = 'Verificado'
                    WHERE id_admin = ?;
                `;
                // Usamos el id_admin real de la base de datos para el UPDATE
                await dbPromise.query(updateQuery, [newPassword, admin.id_admin]); 

                return res.status(200).json({
                    success: true,
                    message: 'Contraseña actualizada y cuenta verificada exitosamente.'
                });

            } catch (error) {
                console.error('Error al cambiar la contraseña del administrador:', error);
                return res.status(500).json({ success: false, message: 'Error interno del servidor al actualizar la contraseña.' });
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