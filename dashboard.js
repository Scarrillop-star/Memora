// js/dashboard.js
(async function () {
  const user = await cargarSesion();
  if (!user) return;

  document.getElementById('saludo').textContent = `Hola, ${user.nombre} 👋`;

  const tarjetas = document.getElementById('tarjetas');
  const tarjetasComunes = [
    { titulo: '📋 Asistencia', texto: 'Consulta el registro de asistencia diario.', href: 'asistencia.html' },
    { titulo: '📝 Tareas', texto: 'Revisa y organiza las tareas de la semana.', href: 'tareas.html' }
  ];

  let extra = '';
  if (user.rol === 'estudiante') {
    extra = 'Puedes ver tu asistencia y marcar tus tareas como completadas.';
  } else if (user.rol === 'lider') {
    extra = 'Como líder puedes crear, editar y eliminar tareas, y ver la asistencia del curso.';
  } else if (user.rol === 'profesor') {
    extra = 'Puedes corregir la asistencia y administrar el calendario de tareas.';
  }

  tarjetas.innerHTML = tarjetasComunes.map(t => `
    <a href="${t.href}" class="card" style="text-decoration:none;color:inherit;display:block;">
      <div style="font-size:18px;font-weight:700;margin-bottom:6px;">${t.titulo}</div>
      <div style="color:#6b7280;font-size:14px;">${t.texto}</div>
    </a>
  `).join('') + `
    <div class="card">
      <div style="font-size:18px;font-weight:700;margin-bottom:6px;">ℹ️ Tu rol</div>
      <div style="color:#6b7280;font-size:14px;">${extra}</div>
    </div>
  `;
})();
