// js/tareas.js
(async function () {
  const user = await cargarSesion();
  if (!user) return;

  const puedeAdministrar = user.rol === 'lider' || user.rol === 'profesor';
  document.getElementById('form-card').style.display = puedeAdministrar ? 'block' : 'none';

  const nombresDias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  let diaSeleccionado = 'Lunes';
  let todasLasTareas = [];

  function pintarTabs() {
    const cont = document.getElementById('dias-tabs');
    cont.innerHTML = nombresDias.map(d => `
      <button data-dia="${d}" class="${d === diaSeleccionado ? 'active' : ''}">${d}</button>
    `).join('');
    cont.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        diaSeleccionado = btn.dataset.dia;
        pintarTabs();
        pintarLista();
      });
    });
  }

  async function cargarTareas() {
    const resp = await fetch('/api/tasks');
    const data = await resp.json();
    todasLasTareas = data.tareas;
    pintarLista();
  }

  function pintarLista() {
    const cont = document.getElementById('lista-tareas');
    const tareasDelDia = todasLasTareas.filter(t => t.dia === diaSeleccionado);

    if (tareasDelDia.length === 0) {
      cont.innerHTML = `<div class="card"><p class="hint">No hay tareas para ${diaSeleccionado}.</p></div>`;
      return;
    }

    cont.innerHTML = tareasDelDia.map(t => `
      <div class="tarea-card ${t.completada ? 'completada' : ''}">
        <div class="materia">${t.materia}</div>
        <div class="descripcion">${t.descripcion}</div>
        <div class="meta">
          ${t.fecha ? `📅 ${t.fecha}` : ''} ${t.fecha_limite ? ` · Fecha límite: ${t.fecha_limite}` : ''}
        </div>
        <div class="acciones">
          <button class="btn ${t.completada ? 'btn-outline' : 'btn-success'} btn-completar" data-id="${t.id}">
            ${t.completada ? '☑ Completada — desmarcar' : '☐ Marcar como completada'}
          </button>
          ${puedeAdministrar ? `
            <button class="btn btn-outline btn-editar" data-id="${t.id}">Editar</button>
            <button class="btn btn-danger btn-eliminar" data-id="${t.id}">Eliminar</button>
          ` : ''}
        </div>
      </div>
    `).join('');

    cont.querySelectorAll('.btn-completar').forEach(btn => {
      btn.addEventListener('click', async () => {
        await fetch(`/api/tasks/${btn.dataset.id}/completar`, { method: 'POST' });
        cargarTareas();
      });
    });

    if (puedeAdministrar) {
      cont.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', () => {
          const t = todasLasTareas.find(x => x.id == btn.dataset.id);
          iniciarEdicion(t);
        });
      });
      cont.querySelectorAll('.btn-eliminar').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('¿Eliminar esta tarea?')) return;
          await fetch(`/api/tasks/${btn.dataset.id}`, { method: 'DELETE' });
          cargarTareas();
        });
      });
    }
  }

  function iniciarEdicion(t) {
    document.getElementById('form-titulo').textContent = '✏️ Editar tarea';
    document.getElementById('tarea-id').value = t.id;
    document.getElementById('f-materia').value = t.materia;
    document.getElementById('f-dia').value = t.dia;
    document.getElementById('f-fecha-limite').value = t.fecha_limite || '';
    document.getElementById('f-descripcion').value = t.descripcion;
    document.getElementById('btn-cancelar-edicion').style.display = 'inline-block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function limpiarFormulario() {
    document.getElementById('form-titulo').textContent = '➕ Nueva tarea';
    document.getElementById('tarea-id').value = '';
    document.getElementById('f-materia').value = '';
    document.getElementById('f-fecha-limite').value = '';
    document.getElementById('f-descripcion').value = '';
    document.getElementById('btn-cancelar-edicion').style.display = 'none';
  }

  if (puedeAdministrar) {
    document.getElementById('btn-cancelar-edicion').addEventListener('click', limpiarFormulario);

    document.getElementById('btn-guardar-tarea').addEventListener('click', async () => {
      const id = document.getElementById('tarea-id').value;
      const body = {
        materia: document.getElementById('f-materia').value.trim(),
        dia: document.getElementById('f-dia').value,
        fecha_limite: document.getElementById('f-fecha-limite').value || null,
        descripcion: document.getElementById('f-descripcion').value.trim(),
        fecha: formatoFechaISO(new Date())
      };
      if (!body.materia || !body.descripcion) {
        alert('Completa materia y descripción.');
        return;
      }

      if (id) {
        await fetch(`/api/tasks/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      } else {
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      }
      limpiarFormulario();
      diaSeleccionado = body.dia;
      pintarTabs();
      cargarTareas();
    });
  }

  pintarTabs();
  cargarTareas();
})();
