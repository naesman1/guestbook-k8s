const express = require('express');
const mysql = require('mysql2/promise');
const pino = require('pino'); // Importa Pino
const app = express();
const port = process.env.PORT || 3000;

// Inicializa el logger de Pino. Por defecto, Pino imprime en JSON a STDOUT.
const logger = pino({
  level: process.env.LOG_LEVEL || 'info', // Nivel de log: 'info', 'debug', 'error', etc.
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
});

// Middleware para parsear JSON en el cuerpo de las solicitudes
app.use(express.json());

// Configuración de la base de datos desde variables de entorno
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'guestbook_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool;

/**
 * Inicializa el pool de conexiones a la base de datos.
 * La creación de la base de datos, la tabla y las restricciones
 * ahora se maneja mediante un script SQL en el contenedor MySQL
 * (vía /docker-entrypoint-initdb.d).
 */
async function initializeDatabase() {
  try {
    pool = mysql.createPool(dbConfig);
    const connection = await pool.getConnection(); // Intentar obtener una conexión para verificar
    connection.release(); // Liberar la conexión inmediatamente

    logger.info('Pool de conexiones a la base de datos inicializado y verificado.');

  } catch (err) {
    logger.fatal({ error: err.message, stack: err.stack }, 'Error crítico al inicializar la base de datos o conectar.');
    process.exit(1); // Salir del proceso si no se puede conectar a la DB
  }
}

// Ruta principal: Agrega una nueva entrada o actualiza una existente y muestra todas
app.get('/', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const userEmail = req.query.email || 'anonimo@example.com'; // Captura el email de la URL o usa un valor por defecto

    // Consulta SQL para UPSERT (Update or Insert):
    // Si el email ya existe (gracias a la restricción UNIQUE), actualiza 'visits' y 'timestamp'.
    // Si no, inserta una nueva entrada con 'visits' en 1.
    const upsertQuery = `
      INSERT INTO entries (email, visits, timestamp)
      VALUES (?, 1, NOW())
      ON DUPLICATE KEY UPDATE
        visits = visits + 1,       -- Incrementa el contador de visitas
        timestamp = NOW();         -- Actualiza el timestamp a la hora actual
    `;
    await connection.query(upsertQuery, [userEmail]);
    logger.info({ email: userEmail }, 'Entrada procesada (insertada o actualizada) en el libro de visitas.');

    // Obtener todas las entradas
    const [result] = await connection.query('SELECT id, email, visits, timestamp FROM entries ORDER BY timestamp DESC');
    connection.release(); // Liberar la conexión

    // Simple HTML para mostrar las entradas
    let htmlResponse = '<h1>Libro de Visitas</h1>';
    htmlResponse += '<p>Cada vez que recargas esta página con el mismo email, se actualiza la entrada existente.</p>';
    htmlResponse += '<p>Puedes agregar un email a la visita añadiéndolo a la URL: `?email=tu@email.com`</p>';
    htmlResponse += '<table border="1" style="width:100%; text-align:left;">';
    htmlResponse += '<thead><tr><th>ID</th><th>Email</th><th>Visitas</th><th>Hora Local</th></tr></thead>';
    htmlResponse += '<tbody>';
    result.forEach(entry => {
      // Formatear el timestamp a la hora local según la TZ del contenedor
      const localTime = new Date(entry.timestamp).toLocaleString();
      htmlResponse += `<tr><td>${entry.id}</td><td>${entry.email}</td><td>${entry.visits}</td><td>${localTime}</td></tr>`;
    });
    htmlResponse += '</tbody></table>';

    res.send(htmlResponse);

  } catch (err) {
    logger.error({ error: err.message, stack: err.stack }, 'Error al procesar la solicitud.');
    res.status(500).send('Error interno del servidor al procesar la solicitud.');
  }
});

// Ruta para obtener solo las entradas (JSON)
app.get('/entries', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT id, email, visits, timestamp FROM entries ORDER BY timestamp DESC');
    connection.release();

    // Formatear el timestamp a la hora local para la respuesta JSON también
    const formattedRows = rows.map(entry => ({
      id: entry.id,
      email: entry.email,
      visits: entry.visits,
      timestamp: new Date(entry.timestamp).toLocaleString() // Hora local
    }));

    res.json(formattedRows);
  } catch (err) {
    logger.error({ error: err.message, stack: err.stack }, 'Error al obtener entradas.');
    res.status(500).json({ error: 'Error al obtener entradas del libro de visitas' });
  }
});

// Iniciar el servidor después de inicializar la base de datos
initializeDatabase().then(() => {
  app.listen(port, () => {
    logger.info(`Aplicación Libro de Visitas escuchando en http://localhost:${port}`);
    logger.info(`Configuración de DB: Host=${dbConfig.host}, User=${dbConfig.user}, DB=${dbConfig.database}`);
  });
}).catch(err => {
  logger.fatal({ error: err.message, stack: err.stack }, 'No se pudo iniciar la aplicación debido a un error en la base de datos.');
  process.exit(1);
});

// Manejo de errores para promesas no manejadas (unhandled rejections)
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason: reason, promise: promise }, 'Unhandled Rejection detected.');
  // Opcional: Podrías querer terminar el proceso en un error crítico no manejado
  // process.exit(1);
});

const client = require('prom-client');
const collectDefaultMetrics = client.collectDefaultMetrics;

// Recolecta métricas por defecto de Node.js (uso de CPU, memoria, etc.)
collectDefaultMetrics({ prefix: 'node_app_' });

// Crea un contador para solicitudes HTTP
const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

// En tu middleware de Express:
app.use((req, res, next) => {
  res.on('finish', () => {
    httpRequestCounter.inc({
      method: req.method,
      route: req.path,
      status: res.statusCode,
    });
  });
  next();
});

// Exponer las métricas en un endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});