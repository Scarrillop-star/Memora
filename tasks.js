// routes/tasks.js
const express = require('express');
const db = require('../db');
const { requireLogin, requireRole } = require('../middleware/auth');

const router = express.Router();

const DIAS_LIMITE_VISIBLE = 3; // días que una tarea completada sigue visible para ESE estudiante

// ---- Listar tareas (todos los roles). Para un estudiante, se oculta
//      una tarea completada por él después de 3 días. ----
router.get('/', requireLogin, (req, res) => {
  const userId = req.session.user.id;
  const tareas = db.prepare(`
    SELECT t.*, tc.completed_at
    FROM tasks t
    LEFT JOIN task_completions tc ON tc.task_id = t.id AND tc.user_id = ?
    ORDER BY
      CASE t.dia
        WHEN 'Lunes' THEN 1 WHEN 'Martes' THEN 2 WHEN 'Miércoles' THEN 3
        WHEN 'Jueves' THEN 4 WHEN 'Viernes' THEN 5 END,
      t.id DESC
  `).all(userId);

  const ahora = Date.now();
  const visibles = tareas.filter(t => {
    if (!t.completed_at) return true; // pendiente: siempre visible
    const completadaHace = ahora - new Date(t.completed_at).getTime();
    const dias = completadaHace / (1000 * 60 * 60 * 24);
    return dias <= DIAS_LIMITE_VISIBLE; // completada: visible solo 3 días
  });

  const resultado = visibles.map(t => ({
    id: t.id,
    materia: t.materia,
    descripcion: t.descripcion,
    dia: t.dia,
    fecha: t.fecha,
    fecha_limite: t.fecha_limite,
    completada: !!t.completed_at
  }));

  res.json({ tareas: resultado });
});

// ---- Crear tarea (lider o profesor) ----
router.post('/', requireRole('lider', 'profesor'), (req, res) => {
  const { materia, descripcion, dia, fecha, fecha_limite } = req.body;
  const diasValidos = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  if (!materia || !descripcion || !diasValidos.includes(dia)) {
    return res.status(400).json({ error: 'Datos de la tarea incompletos o inválidos.' });
  }
  const info = db.prepare(`
    INSERT INTO tasks (materia, descripcion, dia, fecha, fecha_limite, creado_por)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(materia, descripcion, dia, fecha || null, fecha_limite || null, req.session.user.id);

  res.json({ ok: true, id: info.lastInsertRowid });
});

// ---- Editar tarea (lider o profesor) ----
router.put('/:id', requireRole('lider', 'profesor'), (req, res) => {
  const { id } = req.params;
  const { materia, descripcion, dia, fecha, fecha_limite } = req.body;
  const existente = db.prepare('SELECT id FROM tasks WHERE id = ?').get(id);
  if (!existente) return res.status(404).json({ error: 'Tarea no encontrada.' });

  db.prepare(`
    UPDATE tasks SET materia = ?, descripcion = ?, dia = ?, fecha = ?, fecha_limite = ?
    WHERE id = ?
  `).run(materia, descripcion, dia, fecha || null, fecha_limite || null, id);

  res.json({ ok: true });
});

// ---- Eliminar tarea (lider o profesor) ----
router.delete('/:id', requireRole('lider', 'profesor'), (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM task_completions WHERE task_id = ?').run(id);
  const info = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  if (info.changes === 0) return res.status(404).json({ error: 'Tarea no encontrada.' });
  res.json({ ok: true });
});

// ---- Marcar/desmarcar como completada (cualquier usuario logueado, solo para sí mismo) ----
router.post('/:id/completar', requireLogin, (req, res) => {
  const { id } = req.params;
  const userId = req.session.user.id;

  const tarea = db.prepare('SELECT id FROM tasks WHERE id = ?').get(id);
  if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada.' });

  const existente = db.prepare('SELECT id FROM task_completions WHERE task_id = ? AND user_id = ?').get(id, userId);
  if (existente) {
    // Ya estaba completada -> se desmarca (por si el estudiante se equivocó)
    db.prepare('DELETE FROM task_completions WHERE id = ?').run(existente.id);
    return res.json({ ok: true, completada: false });
  }

  db.prepare('INSERT INTO task_completions (task_id, user_id, completed_at) VALUES (?, ?, ?)')
    .run(id, userId, new Date().toISOString());
  res.json({ ok: true, completada: true });
});

module.exports = router;
