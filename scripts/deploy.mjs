// Publica la app en Firebase siguiendo el método de la cátedra:
// build -> copiar dist/browser a public/ -> firebase deploy.
//
// Uso:
//   npm run deploy               hace todo y publica
//   npm run deploy -- --sin-deploy   prepara public/ pero NO publica
import { execSync } from 'node:child_process';
import { cpSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const PUBLIC = 'public';
const BUILD = 'dist/cine-app/browser';
const sinDeploy = process.argv.includes('--sin-deploy');

const correr = (cmd) => execSync(cmd, { stdio: 'inherit' });

// Limpiar public/ ANTES del build: Angular copia su contenido dentro de dist.
console.log('\n[1/4] Limpiando public/ ...');
for (const archivo of readdirSync(PUBLIC)) {
  if (archivo !== 'favicon.ico') {
    rmSync(join(PUBLIC, archivo), { recursive: true, force: true });
  }
}

console.log('\n[2/4] Compilando (ng build) ...');
correr('npx ng build');

console.log('\n[3/4] Copiando dist/browser a public/ ...');
cpSync(BUILD, PUBLIC, { recursive: true, force: true });

if (sinDeploy) {
  console.log('\n[4/4] Omitido (--sin-deploy). public/ quedó listo para publicar.');
} else {
  console.log('\n[4/4] Publicando en Firebase ...');
  correr('firebase deploy --only hosting');
}
