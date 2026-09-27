// routes/attendance.js
const express = require('express');
const db = require('../db');
const { requireLogin, requireRole } = require('../middleware/auth');

const router = express.Router();

function hoyISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}
function horaActual() {
  const d = new Date();
  return d.toTimeString().slice(0, 8); // HH:MM:SS
}
function getConfigValor(clave) {
  const row = db.prepare('SELECT valor FROM config WHERE clave = ?').get(clave);
  return row ? row.valor : null;
}

// -------------------------------------------------------------------
// FUNCIÓN CENTRAL: decide el estado de asistencia según la hora.
// Tanto la simulación como (más adelante) el ESP32 real llaman a ESTA
// misma función, así que la lógica de negocio vive en un solo lugar.
// -------------------------------------------------------------------
function registrarAsistenciaPorHuella(userId) {
  const user = db.prepare("SELECT * FROM users WHERE id = ? AND rol IN ('estudiante','lider')").get(userId);
  if (!user) {
    return { ok: false, error: 'Estudiante no encontrado.' };
  }

  const fecha = hoyISO();
  const hora = horaActual();

  const finPresente = getConfigValor('hora_fin_presente'); // "07:05"
  const finAtraso = getConfigValor('hora_fin_atraso');     // "07:15"

  let estado;
  if (hora <= finPresente + ':59') estado = 'presente';
  else if (hora <= finAtraso + ':59') estado = 'atraso';
  else estado = 'ausente';

  // Si ya existe un registro de hoy para este estudiante, no lo duplicamos
  const existente = db.prepare('SELECT id FROM attendance WHERE user_id = ? AND fecha = ?').get(userId, fecha);
  if (existente) {
    db.prepare('UPDATE attendance SET hora = ?, estado = ? WHERE id = ?').run(hora, estado, existente.id);
  } else {
    db.prepare('INSERT INTO attendance (user_id, fecha, hora, estado) VALUES (?, ?, ?, ?)')
      .run(userId, fecha, hora, estado);
  }

  return { ok: true, nombre: user.nombre, fecha, hora, estado };
}

// ---- Consultar asistencia de un día (todos los roles autenticados) ----
router.get('/:fecha', requireLogin, (req, res) => {
  const { fecha } = req.params;
  const registros = db.prepare(`
    SELECT u.id as user_id, u.nombre, a.hora, a.estado
    FROM users u
    LEFT JOIN attendance a ON a.user_id = u.id AND a.fecha = ?
    WHERE u.rol IN ('estudiante','lider')
    ORDER BY u.nombre
  `).all(fecha);

  const resultado = registros.map(r => ({
    user_id: r.user_id,
    nombre: r.nombre,
    hora: r.hora || null,
    estado: r.estado || 'ausente' // sin registro todavía = ausente por ahora
  }));

  res.json({ fecha, registros: resultado });
});

// ---- Corregir un registro (SOLO profesor) ----
router.post('/corregir', requireRole('profesor'), (req, res) => {
  const { user_id, fecha, estado, hora } = req.body;
  if (!user_id || !fecha || !estado) {
    return res.status(400).json({ error: 'Datos incompletos.' });
  }
  if (!['presente', 'atraso', 'ausente'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido.' });
  }

  const existente = db.prepare('SELECT id FROM attendance WHERE user_id = ? AND fecha = ?').get(user_id, fecha);
  if (existente) {
    db.prepare('UPDATE attendance SET estado = ?, hora = ? WHERE id = ?').run(estado, hora || null, existente.id);
  } else {
    db.prepare('INSERT INTO attendance (user_id, fecha, hora, estado) VALUES (?, ?, ?, ?)')
      .run(user_id, fecha, hora || null, estado);
  }
  res.json({ ok: true });
});

// ---- Ver / editar configuración de horarios (SOLO profesor) ----
router.get('/config/horarios', requireLogin, (req, res) => {
  res.json({
    hora_inicio: getConfigValor('hora_inicio'),
    hora_fin_presente: getConfigValor('hora_fin_presente'),
    hora_fin_atraso: getConfigValor('hora_fin_atraso')
  });
});

router.post('/config/horarios', requireRole('profesor'), (req, res) => {
  const { hora_inicio, hora_fin_presente, hora_fin_atraso } = req.body;
  const set = db.prepare('UPDATE config SET valor = ? WHERE clave = ?');
  if (hora_inicio) set.run(hora_inicio, 'hora_inicio');
  if (hora_fin_presente) set.run(hora_fin_presente, 'hora_fin_presente');
  if (hora_fin_atraso) set.run(hora_fin_atraso, 'hora_fin_atraso');
  res.json({ ok: true });
});

// ---- Marcar automáticamente como ausentes a quien no registró huella ----
// El profesor presiona un botón "Finalizar registro del día" que llama a esto.
router.post('/finalizar-dia', requireRole('profesor'), (req, res) => {
  const fecha = req.body.fecha || hoyISO();
  const estudiantes = db.prepare("SELECT id FROM users WHERE rol IN ('estudiante','lider')").all();
  const yaRegistrado = db.prepare('SELECT id FROM attendance WHERE user_id = ? AND fecha = ?');
  const insertar = db.prepare('INSERT INTO attendance (user_id, fecha, hora, estado) VALUES (?, ?, NULL, ?)');

  let marcados = 0;
  for (const e of estudiantes) {
    if (!yaRegistrado.get(e.id, fecha)) {
      insertar.run(e.id, fecha, 'ausente');
      marcados++;
    }
  }
  res.json({ ok: true, marcados });
});

// =====================================================================
// SIMULACIÓN (TEMPORAL) — reemplazar esta sección por la comunicación
// real con el ESP32 cuando el prototipo físico esté listo.
// Usa exactamente la misma función registrarAsistenciaPorHuella().
// =====================================================================
router.post('/simular-huella', requireLogin, (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'Falta user_id.' });
  const resultado = registrarAsistenciaPorHuella(user_id);
  if (!resultado.ok) return res.status(404).json(resultado);
  res.json(resultado);
});

// =====================================================================
// RUTA REAL PARA EL ESP32 (ya preparada, no requiere sesión de navegador,
// usa una llave compartida simple en su lugar). Ver README para más detalle.
// =====================================================================
const ESP32_KEY = process.env.MEMORA_ESP32_KEY || 'memora-esp32-clave-temporal';

router.post('/fingerprint', (req, res) => {
  const llave = req.header('x-memora-key');
  if (llave !== ESP32_KEY) {
    return res.status(401).json({ error: 'Llave del dispositivo inválida.' });
  }
  const { student_id } = req.body; // el ESP32 debe enviar el ID que identificó la huella
  if (!student_id) return res.status(400).json({ error: 'Falta student_id.' });

  const resultado = registrarAsistenciaPorHuella(student_id);
  if (!resultado.ok) return res.status(404).json(resultado);
  res.json(resultado);
});

module.exports = router;
