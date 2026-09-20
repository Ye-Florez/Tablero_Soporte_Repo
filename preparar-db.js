// Prepara el archivo db.json que usa json-server.
//
// db.semilla.json guarda los datos iniciales y nunca cambia.
// db.json es la "base de datos" viva: json-server la reescribe con cada
// POST, PUT, PATCH o DELETE.
//
//   node preparar-db.js           crea db.json solo si todavía no existe
//   node preparar-db.js --forzar  lo reemplaza y vuelve a los datos iniciales

const fs = require('fs');

const forzar = process.argv.includes('--forzar');

if (forzar || !fs.existsSync('db.json')) {
  fs.copyFileSync('db.semilla.json', 'db.json');
  console.log(forzar
    ? 'Listo: db.json volvió a los datos iniciales.'
    : 'Listo: se creó db.json a partir de db.semilla.json.');
}
