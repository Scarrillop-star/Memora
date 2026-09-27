// js/auth.js — login en dos pasos: primero el usuario, luego
// "crear contraseña" (primera vez) o "ingresar" (ya la tiene).

const formUsuario = document.getElementById('form-usuario');
const formLogin = document.getElementById('form-login');
const formCrear = document.getElementById('form-crear');
const demoBox = document.getElementById('demo-box');

let usuarioActual = '';

formUsuario.addEventListener('submit', async (e) => {
  e.preventDefault();
  usuarioActual = document.getElementById('usuario').value.trim();
  const errorEl = document.getElementById('error-usuario');
  errorEl.textContent = '';

  if (!usuarioActual) return;

  try {
    const resp = await fetch(`/api/auth/estado/${encodeURIComponent(usuarioActual)}`);
    const data = await resp.json();

    if (!resp.ok) {
      errorEl.textContent = data.error || 'Usuario no encontrado.';
      return;
    }

    formUsuario.style.display = 'none';
    demoBox.style.display = 'none';

    if (data.requiere_configuracion) {
      document.getElementById('usuario-detectado-crear').textContent =
        `Hola, ${usuarioActual}. Es tu primera vez: crea tu contraseña.`;
      formCrear.style.display = 'block';
      document.getElementById('crear-password').focus();
    } else {
      document.getElementById('usuario-detectado-login').textContent = `Usuario: ${usuarioActual}`;
      formLogin.style.display = 'block';
      document.getElementById('password').focus();
    }
  } catch (err) {
    errorEl.textContent = 'No se pudo conectar con el servidor.';
  }
});

function volverAlPaso1() {
  formLogin.style.display = 'none';
  formCrear.style.display = 'none';
  formUsuario.style.display = 'block';
  demoBox.style.display = 'block';
  document.getElementById('error-login').textContent = '';
  document.getElementById('error-crear').textContent = '';
  document.getElementById('usuario').value = '';
  document.getElementById('usuario').focus();
}

document.getElementById('btn-volver-1').addEventListener('click', volverAlPaso1);
document.getElementById('btn-volver-2').addEventListener('click', volverAlPaso1);

formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('error-login');
  errorEl.textContent = '';

  try {
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: usuarioActual, password })
    });
    const data = await resp.json();
    if (!resp.ok) {
      errorEl.textContent = data.error || 'Error al iniciar sesión.';
      return;
    }
    window.location.href = 'dashboard.html';
  } catch (err) {
    errorEl.textContent = 'No se pudo conectar con el servidor.';
  }
});

formCrear.addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = document.getElementById('crear-password').value;
  const confirmar = document.getElementById('crear-confirmar').value;
  const errorEl = document.getElementById('error-crear');
  errorEl.textContent = '';

  try {
    const resp = await fetch('/api/auth/configurar-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: usuarioActual, password, confirmar })
    });
    const data = await resp.json();
    if (!resp.ok) {
      errorEl.textContent = data.error || 'No se pudo crear la contraseña.';
      return;
    }
    window.location.href = 'dashboard.html';
  } catch (err) {
    errorEl.textContent = 'No se pudo conectar con el servidor.';
  }
});
