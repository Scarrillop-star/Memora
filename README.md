# MEMORA — Sistema de asistencia y tareas escolares

## 1. ¿Qué necesitas instalar?

Solo una cosa: **Node.js** (versión 18 o más reciente).
Descárgalo gratis en: https://nodejs.org (elige la versión "LTS").

Para saber si ya lo tienes, abre una terminal y escribe:
```
node -v
```
Si aparece un número de versión, ya está instalado.

## 2. ¿Dónde colocar los archivos?

Copia toda la carpeta `memora` (tal como está) a cualquier lugar de tu computadora,
por ejemplo al Escritorio. La estructura es:

```
memora/
  server.js          <- inicia el servidor
  db.js               <- crea la base de datos
  seed.js              <- crea las cuentas de prueba
  package.json
  data/                <- aquí se guardará memora.db (se crea solo)
  middleware/auth.js   <- comprobación de permisos
  routes/
    auth.js            <- login / logout
    attendance.js       <- asistencia + huella
    tasks.js             <- tareas
  public/               <- todo lo que ve el navegador
    index.html           <- login
    dashboard.html
    asistencia.html
    tareas.html
    css/style.css
    js/ (auth.js, common.js, dashboard.js, asistencia.js, tareas.js)
```

## 3. Cómo ejecutar la página (paso a paso)

1. Abre una terminal DENTRO de la carpeta `memora`.
   - Windows: entra a la carpeta, escribe `cmd` en la barra de direcciones y Enter.
   - Mac: clic derecho en la carpeta → "Nueva terminal en la carpeta" (o usa `cd`).
2. Instala las dependencias (solo la primera vez):
   ```
   npm install
   ```
3. Crea las cuentas de demostración (solo la primera vez):
   ```
   npm run seed
   ```
4. Inicia el servidor:
   ```
   npm start
   ```
5. Abre el navegador en:
   ```
   http://localhost:3000
   ```

Para usarla desde una tablet en la misma red WiFi que la computadora,
usa la IP de la computadora en vez de "localhost", por ejemplo:
`http://192.168.1.15:3000`.

## 4. Cuentas de demostración (sin contraseña — cada quien crea la suya)

Ninguna cuenta trae contraseña de fábrica. La primera vez que alguien escribe
su usuario en la pantalla de inicio, MEMORA detecta que es nuevo y le pide
crear y confirmar su propia contraseña (mínimo 4 caracteres). Las siguientes
veces, esa misma pantalla le pedirá directamente la contraseña que creó.

| Usuario       | Rol         |
|---------------|-------------|
| estudiante1…5 | Estudiante  |
| lider1, lider2| Líder       |
| profesor      | Profesor    |

Si alguien olvida su contraseña, el profesor (o quien administre el servidor)
puede "reiniciarla" corriendo este comando desde la carpeta `memora`:
```
node -e "require('./db').prepare('UPDATE users SET password_hash=NULL, requiere_configuracion=1 WHERE usuario=?').run('NOMBRE_DE_USUARIO')"
```
Eso hace que esa cuenta vuelva a pedir "crear contraseña" la próxima vez.

## 5. Dónde vive cada requisito que pediste

- **Permisos reales**, no solo botones ocultos: `middleware/auth.js` bloquea cada
  ruta de la API según el rol guardado en la sesión del servidor. Aunque alguien
  abra la consola del navegador y llame a la API directamente, el servidor
  rechaza la petición si el rol no coincide (`403 Forbidden`).
- **Base de datos persistente**: `data/memora.db` (SQLite). Es un solo archivo;
  no se borra al recargar la página ni al reiniciar el servidor. Solo se borraría
  si tú eliminas ese archivo a propósito.
- **Asistencia con horarios**: se configuran en la pestaña Asistencia (solo el
  profesor los puede cambiar) y se guardan en la tabla `config`.
- **Marcar ausentes automáticamente**: el botón "Finalizar registro del día"
  (visible solo para el profesor) marca como ausente a quien no registró huella.
  Si prefieres que sea 100% automático sin botón, se puede agregar más adelante
  un temporizador con la librería `node-cron`, pero para un proyecto escolar
  el botón es más simple de explicar y de controlar.
- **Tareas visibles solo 3 días tras completarlas**: la lógica está en
  `routes/tasks.js`, función que filtra por `completed_at` + 3 días. Es por
  estudiante: si Juan completa una tarea, solo desaparece de la vista de Juan.

## 6. Cómo conectar el sensor ESP32 (más adelante)

**La forma más simple y segura para un proyecto escolar** es que el ESP32 se
conecte a la misma red WiFi que la computadora y envíe una petición HTTP
normal (POST) cada vez que alguien coloca su huella. No hace falta nada más
complicado (no se necesita MQTT ni servidores externos).

Ya dejé la ruta preparada en `routes/attendance.js`:

```
POST http://<IP-de-la-computadora>:3000/api/attendance/fingerprint
Headers:  x-memora-key: memora-esp32-clave-temporal
Body (JSON): { "student_id": 3 }
```

- `student_id` es el número de usuario en la base de datos que corresponde a
  la huella reconocida (tendrás que guardar en el ESP32 una tabla sencilla que
  relacione "huella #1" → `student_id` 1, etc. — eso se configura al enrolar
  cada huella en el sensor).
- El encabezado `x-memora-key` es una contraseña simple para que solo tu
  ESP32 pueda usar esa ruta. Puedes cambiarla definiendo la variable de entorno
  `MEMORA_ESP32_KEY` antes de iniciar el servidor.
- El ESP32 (con la librería `HTTPClient.h` de Arduino) simplemente hace un
  `POST` como el de arriba cuando el sensor de huellas reconoce a alguien.

**Importante:** el código de simulación (botón "Simulador de huella" en la
página de Asistencia, en `routes/attendance.js`) y el código real del ESP32
llaman exactamente a la misma función `registrarAsistenciaPorHuella()`. Cuando
el prototipo físico esté listo, no hay que tocar la lógica de asistencia —
solo dejas de usar el botón de simulación y el ESP32 empieza a alimentar los
mismos registros automáticamente.

## 7. Publicar MEMORA en internet (URL pública, no solo local)

Si quieres que cualquiera pueda entrar a MEMORA desde una dirección de
internet (no solo en la WiFi de la escuela), sigue esto:

1. Crea un repositorio nuevo en GitHub (por ejemplo, llamado `memora`).
2. Sube ahí todo el contenido de esta carpeta (arrastrando los archivos
   desde la web de GitHub, sin incluir la carpeta `node_modules` si la
   llegaste a crear localmente).
3. Crea una cuenta gratuita en https://render.com y conéctala con tu
   cuenta de GitHub.
4. En Render, crea un "New Web Service", selecciona tu repositorio `memora`.
5. Configura:
   - Build Command: `npm install`
   - Start Command: `npm start`
6. Dale a "Create Web Service". Render te va a dar una URL como
   `https://memora-xxxx.onrender.com` — esa es la dirección pública.

Las 8 cuentas de demostración se crean automáticamente la primera vez que
arranca el servidor (no hace falta correr `npm run seed` a mano en Render).

**Nota:** en el plan gratuito de Render, la página "se duerme" si nadie
la visita en 15 minutos, y tarda como un minuto en "despertar" en la
siguiente visita. Es normal y no afecta el funcionamiento, solo la
primera carga después de estar inactiva.

**Importante para el ESP32:** una vez publicada, cambia en
`memora_esp32.ino` la línea de `SERVIDOR_IP` y `SERVIDOR_PUERTO` por tu
nueva URL de Render, usando HTTPS. Avísame cuando llegues a este paso y
te ayudo a ajustar ese código.

## 8. Notas para el proyecto escolar

- Las contraseñas se guardan cifradas (`bcryptjs`), no en texto plano.
- No se usa ningún dato personal real, solo nombres genéricos de prueba.
- Si algo no funciona, revisa primero que hayas corrido `npm install` y
  `npm run seed` antes de `npm start`.
