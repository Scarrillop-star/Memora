// db.js
// Aquí se crea/abre el archivo de base de datos y se definen las tablas.
// SQLite guarda todo en un solo archivo: data/memora.db
// Ese archivo NO se borra al reiniciar el servidor ni al recargar la página.

const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'data', 'memora.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

// ---------- Tablas ----------

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  usuario TEXT NOT NULL UNIQUE,
  password_hash TEXT,                              -- NULL = todavía no ha creado su contraseña
  requiere_configuracion INTEGER NOT NULL DEFAULT 1, -- 1 = debe crear su contraseña al entrar
  rol TEXT NOT NULL CHECK (rol IN ('estudiante','lider','profesor'))
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  fecha TEXT NOT NULL,      -- YYYY-MM-DD
  hora TEXT,                -- HH:MM:SS (NULL si nunca marcó)
  estado TEXT NOT NULL CHECK (estado IN ('presente','atraso','ausente')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, fecha)
);

CREATE TABLE IF NOT EXISTS config (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  materia TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  dia TEXT NOT NULL CHECK (dia IN ('Lunes','Martes','Miércoles','Jueves','Viernes')),
  fecha TEXT,
  fecha_limite TEXT,
  creado_por INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (creado_por) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS task_completions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  completed_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(task_id, user_id)
);
`);

// Configuración por defecto de horarios de asistencia (solo si no existe aún)
const defaults = {
  hora_inicio: '07:00',
  hora_fin_presente: '07:05',
  hora_fin_atraso: '07:15'
};
const getConfig = db.prepare('SELECT valor FROM config WHERE clave = ?');
const setConfig = db.prepare('INSERT INTO config (clave, valor) VALUES (?, ?)');
for (const [clave, valor] of Object.entries(defaults)) {
  if (!getConfig.get(clave)) setConfig.run(clave, valor);
}

// ---------- Cuentas de demostración ----------
// Se crean automáticamente la primera vez que arranca el servidor (si la
// tabla users está vacía). Así no hace falta correr "npm run seed" a mano
// cuando el proyecto se sube a un servicio de hosting como Render.
const totalUsuarios = db.prepare('SELECT COUNT(*) as n FROM users').get().n;
if (totalUsuarios === 0) {
  const cuentasDemo = [
    { nombre: 'Estudiante 1', usuario: 'estudiante1', rol: 'estudiante' },
    { nombre: 'Estudiante 2', usuario: 'estudiante2', rol: 'estudiante' },
    { nombre: 'Estudiante 3', usuario: 'estudiante3', rol: 'estudiante' },
    { nombre: 'Estudiante 4', usuario: 'estudiante4', rol: 'estudiante' },
    { nombre: 'Estudiante 5', usuario: 'estudiante5', rol: 'estudiante' },
    { nombre: 'Líder 1', usuario: 'lider1', rol: 'lider' },
    { nombre: 'Líder 2', usuario: 'lider2', rol: 'lider' },
    { nombre: 'Profesor', usuario: 'profesor', rol: 'profesor' }
  ];
  const insertarUsuario = db.prepare(
    'INSERT INTO users (nombre, usuario, password_hash, requiere_configuracion, rol) VALUES (?, ?, NULL, 1, ?)'
  );
  for (const c of cuentasDemo) insertarUsuario.run(c.nombre, c.usuario, c.rol);
  console.log('Cuentas de demostración creadas automáticamente (sin contraseña).');
}

module.exports = db;
