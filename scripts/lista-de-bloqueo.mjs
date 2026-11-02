#!/usr/bin/env node
/**
 * Lista de bloqueo de datos personales. El sitio es anónimo: el autor aparece solo en /autor.
 *
 * Dos escaneos:
 *
 * 1. FUENTE (por defecto): todos los archivos de texto versionados (`git ls-files`: docs, src, e2e, README,
 *    package.json, workflows...). Es el escaneo que protege el repo público. Excepciones:
 *      - docs/autor/**  (la página del autor);
 *      - la línea `repo:` del frontmatter de los casos de estudio en docs/proyectos/**, que apunta al
 *        repo del código en el GitHub personal.
 *
 * 2. BUILD (`--build <dir>`): todo lo que se publica, SIN excepciones. Solo tiene sentido mientras la página
 *    /autor no exista. Cuando vuelva, su contenido va a quedar en autor.html y en el chunk de JS de esa ruta, que
 *    Docusaurus nombra con un hash (los chunks de cada ruta no aparecen en su HTML). Ahí hay dos caminos:
 *    excluir los chunks de /autor leyendo `.docusaurus/routesChunkNames.json` (mapa de ruta a chunks), o
 *    confiar en el escaneo de fuente, que ya cubre todo lo versionado y no depende de los hashes.
 *
 * Los patrones se arman con fragmentos para que este archivo no contenga, él mismo, los datos que bloquea.
 *
 * Uso:
 *   node scripts/lista-de-bloqueo.mjs                  # fuente
 *   node scripts/lista-de-bloqueo.mjs --build build    # build sin excepciones
 */
import {execFileSync} from 'node:child_process';
import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import {extname, join, relative, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const re = (...partes) => new RegExp(partes.join(''), 'gi');

export const PATRONES = [
  {nombre: 'usuario personal', regex: re('db', '\\.?', 'quir', 'oga', '\\d*')},
  {nombre: 'apellido', regex: re('quir', 'oga')},
  {nombre: 'nombre de pila', regex: re('\\bday', 'hana\\b')},
  {nombre: 'email personal', regex: re('[a-z0-9._+-]*', 'quir', 'oga', '[a-z0-9._+-]*@[a-z0-9.-]+')},
  {nombre: 'LinkedIn personal', regex: re('linkedin\\.com/', 'in/')},
  {nombre: 'foto personal', regex: re('\\bm', 'e\\.png\\b')},
];

/** Línea `repo: https://github.com/<usuario personal>/<repo>` de un caso de estudio. */
const LINEA_REPO = new RegExp(String.raw`^\s*repo:\s*https?://github\.com/db` + 'quir' + String.raw`oga/[A-Za-z0-9._-]+\s*$`, 'i');

const EXTENSIONES_TEXTO = new Set([
  '.md', '.mdx', '.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.css', '.html', '.xml', '.txt', '.svg',
  '.yml', '.yaml', '.map', '.webmanifest', '.gitignore', '',
]);

const posix = (r) => r.split(sep).join('/');

function esExcepcionFuente(rel) {
  return rel.startsWith('docs/autor/');
}

function buscar(rel, texto, hallazgos, {soloLineasRepo = false} = {}) {
  const lineas = texto.split('\n');
  lineas.forEach((linea, i) => {
    if (soloLineasRepo && LINEA_REPO.test(linea)) return;
    for (const {nombre, regex} of PATRONES) {
      regex.lastIndex = 0;
      for (const m of linea.matchAll(regex)) {
        const j = m.index ?? 0;
        hallazgos.push({
          archivo: rel,
          linea: i + 1,
          patron: nombre,
          fragmento: linea.slice(Math.max(0, j - 30), j + m[0].length + 30).trim().slice(0, 120),
        });
      }
    }
  });
}

/** Archivos de texto versionados. Falla si `raiz` no es un repo git. */
export function archivosVersionados(raiz) {
  const salida = execFileSync('git', ['ls-files', '-z'], {cwd: raiz, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
  return salida.split('\0').filter(Boolean);
}

/** Escaneo del código fuente versionado, con las excepciones de /autor y del campo `repo:` de los casos. */
export function escanearFuente(raiz) {
  const hallazgos = [];
  let revisados = 0;
  for (const rel of archivosVersionados(raiz)) {
    if (!EXTENSIONES_TEXTO.has(extname(rel).toLowerCase())) continue;
    if (!existsSync(join(raiz, rel))) continue; // borrado en el árbol de trabajo
    if (esExcepcionFuente(rel)) continue;
    revisados += 1;
    buscar(rel, readFileSync(join(raiz, rel), 'utf8'), hallazgos, {soloLineasRepo: rel.startsWith('docs/proyectos/')});
  }
  return {hallazgos, revisados};
}

function* recorrer(dir) {
  for (const n of readdirSync(dir)) {
    const ruta = join(dir, n);
    if (statSync(ruta).isDirectory()) yield* recorrer(ruta);
    else yield ruta;
  }
}

/** Escaneo del build, sin excepciones. */
export function escanearBuild(raiz) {
  if (!existsSync(raiz)) throw new Error(`No existe el directorio del build: ${raiz}`);
  const hallazgos = [];
  let revisados = 0;
  for (const ruta of recorrer(raiz)) {
    if (!EXTENSIONES_TEXTO.has(extname(ruta).toLowerCase())) continue;
    revisados += 1;
    buscar(posix(relative(raiz, ruta)), readFileSync(ruta, 'utf8'), hallazgos);
  }
  return {hallazgos, revisados, hayAutor: existsSync(join(raiz, 'autor.html'))};
}

function informar(titulo, {hallazgos, revisados}) {
  if (hallazgos.length) {
    console.error(`${titulo}: ${hallazgos.length} aparición(es) de datos personales.`);
    for (const h of hallazgos) console.error(`  ${h.archivo}:${h.linea} [${h.patron}] ...${h.fragmento}...`);
    return false;
  }
  console.log(`${titulo}: 0 apariciones (${revisados} archivos de texto revisados).`);
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const i = args.indexOf('--build');
  let ok;
  if (i >= 0) {
    const dir = args[i + 1] ?? 'build';
    const r = escanearBuild(dir);
    if (r.hayAutor) {
      console.warn('Aviso: el build tiene /autor (autor.html). Este escaneo no tiene excepciones y va a fallar: ver el comentario del script.');
    }
    ok = informar(`Lista de bloqueo, build (${dir}, sin excepciones)`, r);
  } else {
    ok = informar('Lista de bloqueo, fuente versionada', escanearFuente(process.cwd()));
  }
  process.exit(ok ? 0 : 1);
}
