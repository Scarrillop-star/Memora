// js/common.js
// Se incluye en todas las páginas internas (dashboard, asistencia, tareas).
// Pinta la barra de navegación según el rol y protege la página si no hay sesión.

let SESSION_USER = null;

async function cargarSesion() {
  const resp = await fetch('/api/auth/me');
  if (!resp.ok) {
    window.location.href = 'index.html';
    return null;
  }
  const data = await resp.json();
  SESSION_USER = data.user;
  pintarTopbar();
  return SESSION_USER;
}

function pintarTopbar() {
  const el = document.getElementById('topbar');
  if (!el || !SESSION_USER) return;

  const paginaActual = window.location.pathname.split('/').pop();
  const link = (href, texto) =>
    `<a href="${href}" class="${paginaActual === href ? 'active' : ''}">${texto}</a>`;

  const rolTexto = { estudiante: 'Estudiante', lider: 'Líder', profesor: 'Profesor' }[SESSION_USER.rol];

  el.innerHTML = `
    <div class="logo">MEMORA</div>
    <nav>
      ${link('dashboard.html', 'Inicio')}
      ${link('asistencia.html', 'Asistencia')}
      ${link('tareas.html', 'Tareas')}
    </nav>
    <div class="user-box">
      <span>${SESSION_USER.nombre}</span>
      <span class="rol-badge">${rolTexto}</span>
      <button id="btn-logout">Salir</button>
    </div>
  `;

  document.getElementById('btn-logout').addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = 'index.html';
  });
}

function estadoBadge(estado) {
  const textos = { presente: '🟢 Presente', atraso: '🟡 Atraso', ausente: '🔴 Ausente' };
  const clases = { presente: 'estado-presente', atraso: 'estado-atraso', ausente: 'estado-ausente' };
  return `<span class="estado-badge ${clases[estado]}">${textos[estado]}</span>`;
}

function formatoFechaISO(d) {
  return d.toISOString().slice(0, 10);
}
