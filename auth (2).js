// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

// ---- Paso 1: comprobar el usuario antes de pedir contraseña ----
// El frontend usa esto para saber si debe mostrar "crear contraseña"
// (primera vez) o "ingresa tu contraseña" (ya la tiene).
router.get('/estado/:usuario', (req, res) => {
  const user = db.prepare('SELECT usuario, requiere_configuracion FROM users WHERE usuario = ?')
    .get(req.params.usuario);
  if (!user) return res.status(404).json({ error: 'Ese usuario no existe.' });
  res.json({ existe: true, requiere_configuracion: !!user.requiere_configuracion });
});

// ---- Primera vez: el usuario crea su propia contraseña ----
router.post('/configurar-password', (req, res) => {
  const { usuario, password, confirmar } = req.body;
  if (!usuario || !password || !confirmar) {
    return res.status(400).json({ error: 'Faltan datos.' });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres.' });
  }
  if (password !== confirmar) {
    return res.status(400).json({ error: 'Las contraseñas no coinciden.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE usuario = ?').get(usuario);
  if (!user) return res.status(404).json({ error: 'Ese usuario no existe.' });
  if (!user.requiere_configuracion) {
    return res.status(400).json({ error: 'Esta cuenta ya tiene una contraseña. Usa "Iniciar sesión".' });
  }

  const hash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE users SET password_hash = ?, requiere_configuracion = 0 WHERE id = ?')
    .run(hash, user.id);

  req.session.user = { id: user.id, nombre: user.nombre, usuario: user.usuario, rol: user.rol };
  res.json({ ok: true, user: req.session.user });
});

// ---- Login normal (cuentas que ya tienen contraseña creada) ----
router.post('/login', (req, res) => {
  const { usuario, password } = req.body;
  if (!usuario || !password) {
    return res.status(400).json({ error: 'Falta usuario o contraseña.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE usuario = ?').get(usuario);
  if (!user) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
  }
  if (user.requiere_configuracion || !user.password_hash) {
    return res.status(400).json({ error: 'Esta cuenta todavía no tiene contraseña. Créala primero.', requiere_configuracion: true });
  }
  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
  }

  req.session.user = { id: user.id, nombre: user.nombre, usuario: user.usuario, rol: user.rol };
  res.json({ ok: true, user: req.session.user });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'No has iniciado sesión.' });
  res.json({ user: req.session.user });
});

// Lista de estudiantes/líderes, útil para el panel de asistencia y el simulador de huella
router.get('/estudiantes', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'No has iniciado sesión.' });
  const estudiantes = db
    .prepare("SELECT id, nombre, rol FROM users WHERE rol IN ('estudiante','lider') ORDER BY nombre")
    .all();
  res.json({ estudiantes });
});

module.exports = router;
