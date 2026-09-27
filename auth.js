// middleware/auth.js
// Aquí es donde REALMENTE se comprueban los permisos, en el servidor.
// Ningún botón oculto en el frontend reemplaza esto: si alguien llama
// a la API directamente sin el rol correcto, esta capa lo bloquea.

function requireLogin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'No has iniciado sesión.' });
  }
  next();
}

// Uso: requireRole('profesor') o requireRole('profesor', 'lider')
function requireRole(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'No has iniciado sesión.' });
    }
    if (!rolesPermitidos.includes(req.session.user.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para hacer esto.' });
    }
    next();
  };
}

module.exports = { requireLogin, requireRole };
