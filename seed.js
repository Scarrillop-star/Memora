// seed.js
// Crea las cuentas de demostración SIN contraseña. Cada usuario creará la
// suya la primera vez que entre a MEMORA. Ejecutar UNA sola vez con: npm run seed
// No usa datos personales reales, solo nombres genéricos "Estudiante N".

const db = require('./db');

const cuentas = [
  { nombre: 'Estudiante 1', usuario: 'estudiante1', rol: 'estudiante' },
  { nombre: 'Estudiante 2', usuario: 'estudiante2', rol: 'estudiante' },
  { nombre: 'Estudiante 3', usuario: 'estudiante3', rol: 'estudiante' },
  { nombre: 'Estudiante 4', usuario: 'estudiante4', rol: 'estudiante' },
  { nombre: 'Estudiante 5', usuario: 'estudiante5', rol: 'estudiante' },
  { nombre: 'Líder 1', usuario: 'lider1', rol: 'lider' },
  { nombre: 'Líder 2', usuario: 'lider2', rol: 'lider' },
  { nombre: 'Profesor', usuario: 'profesor', rol: 'profesor' }
];

const existe = db.prepare('SELECT id FROM users WHERE usuario = ?');
const insertar = db.prepare(
  'INSERT INTO users (nombre, usuario, password_hash, requiere_configuracion, rol) VALUES (?, ?, NULL, 1, ?)'
);

let creados = 0;
for (const c of cuentas) {
  if (existe.get(c.usuario)) continue;
  insertar.run(c.nombre, c.usuario, c.rol);
  creados++;
}

console.log(`Listo. ${creados} cuenta(s) nueva(s) creada(s).`);
console.log('Nadie tiene contraseña todavía: cada quien la crea al entrar por primera vez con su usuario.');
console.log('Usuarios disponibles:');
cuentas.forEach(c => console.log(`  ${c.usuario}  ->  ${c.rol}`));
