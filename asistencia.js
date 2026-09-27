// js/asistencia.js
(async function () {
  const user = await cargarSesion();
  if (!user) return;

  const esProfesor = user.rol === 'profesor';
  const puedeVerConfig = esProfesor;

  document.getElementById('config-card').style.display = puedeVerConfig ? 'block' : 'none';
  document.getElementById('simulador-card').style.display = 'block'; // cualquiera puede probar el simulador
  document.getElementById('finalizar-card').style.display = esProfesor ? 'block' : 'none';

  // ---------- Construir los días Lunes-Viernes de la semana actual ----------
  function lunesDeEstaSemana() {
    const hoy = new Date();
    const diaSemana = hoy.getDay(); // 0=domingo
    const offset = diaSemana === 0 ? -6 : 1 - diaSemana;
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() + offset);
    lunes.setHours(0, 0, 0, 0);
    return lunes;
  }

  const nombresDias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  const lunes = lunesDeEstaSemana();
  const dias = nombresDias.map((nombre, i) => {
    const fecha = new Date(lunes);
    fecha.setDate(lunes.getDate() + i);
    return { nombre, fechaISO: formatoFechaISO(fecha), diaNum: fecha.getDate() };
  });

  let fechaSeleccionada = formatoFechaISO(new Date());
  // Si hoy no es un día de lunes a viernes de esta lista, selecciona el lunes
  if (!dias.find(d => d.fechaISO === fechaSeleccionada)) {
    fechaSeleccionada = dias[0].fechaISO;
  }

  function pintarTabs() {
    const cont = document.getElementById('dias-tabs');
    cont.innerHTML = dias.map(d => `
      <button data-fecha="${d.fechaISO}" class="${d.fechaISO === fechaSeleccionada ? 'active' : ''}">
        ${d.nombre} ${d.diaNum}
      </button>
    `).join('');
    cont.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        fechaSeleccionada = btn.dataset.fecha;
        pintarTabs();
        cargarAsistencia();
      });
    });
  }

  async function cargarAsistencia() {
    const resp = await fetch(`/api/attendance/${fechaSeleccionada}`);
    const data = await resp.json();
    const tbody = document.getElementById('tbody-asistencia');

    tbody.innerHTML = data.registros.map(r => `
      <tr>
        <td data-label="Estudiante">${r.nombre}</td>
        <td data-label="Hora">${r.hora || '—'}</td>
        <td data-label="Estado">
          ${esProfesor
            ? `<select class="estado-select" data-user="${r.user_id}">
                 <option value="presente" ${r.estado === 'presente' ? 'selected' : ''}>🟢 Presente</option>
                 <option value="atraso" ${r.estado === 'atraso' ? 'selected' : ''}>🟡 Atraso</option>
                 <option value="ausente" ${r.estado === 'ausente' ? 'selected' : ''}>🔴 Ausente</option>
               </select>`
            : estadoBadge(r.estado)}
        </td>
        <td data-label="">
          ${esProfesor ? `<button class="btn btn-outline btn-guardar-fila" data-user="${r.user_id}">Guardar</button>` : ''}
        </td>
      </tr>
    `).join('');

    if (esProfesor) {
      tbody.querySelectorAll('.btn-guardar-fila').forEach(btn => {
        btn.addEventListener('click', async () => {
          const userId = btn.dataset.user;
          const select = tbody.querySelector(`select[data-user="${userId}"]`);
          await fetch('/api/attendance/corregir', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: Number(userId), fecha: fechaSeleccionada, estado: select.value })
          });
          cargarAsistencia();
        });
      });
    }
  }

  // ---------- Configuración de horarios (solo profesor) ----------
  if (puedeVerConfig) {
    const cfg = await (await fetch('/api/attendance/config/horarios')).json();
    document.getElementById('cfg-inicio').value = cfg.hora_inicio;
    document.getElementById('cfg-presente').value = cfg.hora_fin_presente;
    document.getElementById('cfg-atraso').value = cfg.hora_fin_atraso;

    document.getElementById('btn-guardar-config').addEventListener('click', async () => {
      await fetch('/api/attendance/config/horarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hora_inicio: document.getElementById('cfg-inicio').value,
          hora_fin_presente: document.getElementById('cfg-presente').value,
          hora_fin_atraso: document.getElementById('cfg-atraso').value
        })
      });
      alert('Horarios actualizados.');
    });

    document.getElementById('btn-finalizar').addEventListener('click', async () => {
      const resp = await fetch('/api/attendance/finalizar-dia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha: fechaSeleccionada })
      });
      const data = await resp.json();
      alert(`Se marcaron ${data.marcados} estudiante(s) como ausente(s).`);
      cargarAsistencia();
    });
  }

  // ---------- Simulador de huella ----------
  const estudiantesResp = await (await fetch('/api/auth/estudiantes')).json();
  const selectEst = document.getElementById('select-estudiante');
  selectEst.innerHTML = estudiantesResp.estudiantes.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');

  document.getElementById('btn-simular').addEventListener('click', async () => {
    const userId = selectEst.value;
    const resp = await fetch('/api/attendance/simular-huella', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: Number(userId) })
    });
    const data = await resp.json();
    const out = document.getElementById('simular-resultado');
    if (!resp.ok) {
      out.textContent = data.error || 'Error al simular.';
      return;
    }
    out.textContent = `✅ ${data.nombre} — ${data.hora} — ${data.estado}`;
    if (data.fecha === fechaSeleccionada) cargarAsistencia();
  });

  pintarTabs();
  cargarAsistencia();
})();
