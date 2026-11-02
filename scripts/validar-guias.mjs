#!/usr/bin/env node
/**
 * Valida el frontmatter de las guías (docs/guias/**) según arquitectura.md, sección 5.1. Falla el CI.
 *  - Campos obligatorios y de qué tipo son.
 *  - `area`, `nivel`, `celda` y cada id de `comportamientos` existen en competencias.json, y `celda` es `<area>.<nivel>`.
 *  - Al menos uno de los comportamientos pertenece a la celda declarada (los demás pueden ser de otra celda).
 *  - Hay `respaldo.mercado` o `respaldo.libros`; los recursos citados existen.
 *  - `ultima_revision` es una fecha y no es futura.
 * No valida que las URL respondan: eso es del chequeo semanal de links, no bloqueante.
 */
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join, relative} from 'node:path';
import matter from 'gray-matter';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const NIVELES = ['inicial', 'junior', 'semi_senior', 'senior', 'lead'];

export function validarFrontmatter(fm, competencias, hoy = new Date()) {
  const errores = [];
  const err = (m) => errores.push(m);
  const texto = (v) => typeof v === 'string' && v.trim().length > 0;
  const lista = (v) => Array.isArray(v);

  for (const campo of ['title', 'description']) if (!texto(fm[campo])) err(`${campo}: falta`);
  for (const campo of ['area', 'nivel', 'celda']) if (!texto(fm[campo])) err(`${campo}: falta`);
  for (const campo of ['comportamientos', 'alternativa_externa', 'fuentes', 'herramientas']) {
    if (!lista(fm[campo])) err(`${campo}: tiene que ser una lista (puede ser vacía en herramientas)`);
  }
  if (!fm.respaldo || typeof fm.respaldo !== 'object') err('respaldo: falta');

  const area = competencias.areas.find((a) => a.id === fm.area);
  if (texto(fm.area) && !area) err(`area: ${fm.area} no existe en competencias.json`);
  if (texto(fm.nivel) && !NIVELES.includes(fm.nivel)) err(`nivel: ${fm.nivel} no es ${NIVELES.join(' | ')}`);
  if (texto(fm.celda)) {
    if (fm.celda !== `${fm.area}.${fm.nivel}`) err(`celda: ${fm.celda} no coincide con area.nivel (${fm.area}.${fm.nivel})`);
    else if (area && !area.celdas.some((c) => c.nivel === fm.nivel)) err(`celda: ${fm.celda} no existe`);
  }

  const idsPorCelda = new Map();
  for (const a of competencias.areas) {
    for (const c of a.celdas) {
      for (const b of [...c.comportamientos, ...(c.comportamientos_variante ?? [])]) idsPorCelda.set(b.id, `${a.id}.${c.nivel}`);
    }
  }
  if (lista(fm.comportamientos)) {
    if (fm.comportamientos.length === 0) err('comportamientos: vacío');
    for (const id of fm.comportamientos) if (!idsPorCelda.has(id)) err(`comportamientos: ${id} no existe en competencias.json`);
    if (fm.comportamientos.length && !fm.comportamientos.some((id) => idsPorCelda.get(id) === fm.celda)) {
      err(`comportamientos: ninguno pertenece a la celda declarada (${fm.celda})`);
    }
  }

  const respaldo = fm.respaldo ?? {};
  const mercado = respaldo.mercado ?? [];
  const libros = respaldo.libros ?? [];
  if (!lista(mercado) || !lista(libros)) err('respaldo.mercado y respaldo.libros tienen que ser listas');
  else if (mercado.length === 0 && libros.length === 0) err('respaldo: hace falta respaldo.mercado o respaldo.libros');
  for (const m of lista(mercado) ? mercado : []) {
    if (!lista(m.avisos) || !m.avisos.every((x) => /^A\d+$/.test(x))) err('respaldo.mercado: avisos tiene que ser una lista de ids tipo A04');
    if (!texto(m.seccion)) err('respaldo.mercado: falta seccion');
  }
  const recursos = new Set(competencias.recursos.map((r) => r.id));
  for (const l of lista(libros) ? libros : []) {
    if (!recursos.has(l.recurso)) err(`respaldo.libros: el recurso ${l.recurso} no existe en competencias.json`);
    if (!texto(l.ubicacion)) err(`respaldo.libros: ${l.recurso} sin ubicacion`);
  }
  for (const a of lista(fm.alternativa_externa) ? fm.alternativa_externa : []) {
    if (!texto(a.nombre) || !/^https?:\/\//.test(a.url ?? '') || !texto(a.aporta)) err('alternativa_externa: cada item necesita nombre, url y aporta');
  }
  for (const u of lista(fm.fuentes) ? fm.fuentes : []) if (!/^https?:\/\//.test(u)) err(`fuentes: URL inválida ${u}`);
  for (const h of lista(fm.herramientas) ? fm.herramientas : []) {
    if (!texto(h.nombre) || h.version === undefined || h.version === null || String(h.version).trim() === '') err('herramientas: cada item necesita nombre y version');
  }

  const fecha = fm.ultima_revision instanceof Date ? fm.ultima_revision : new Date(String(fm.ultima_revision));
  if (!fm.ultima_revision || Number.isNaN(fecha.getTime())) err('ultima_revision: falta o no es una fecha (AAAA-MM-DD)');
  else if (fecha > hoy) err(`ultima_revision: ${fecha.toISOString().slice(0, 10)} es una fecha futura`);

  return errores;
}

function* guias(dir) {
  for (const n of readdirSync(dir)) {
    const ruta = join(dir, n);
    if (statSync(ruta).isDirectory()) yield* guias(ruta);
    else if (/\.mdx?$/.test(n)) yield ruta;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const competencias = JSON.parse(readFileSync(join(raiz, 'src/data/competencias.json'), 'utf8'));
  let total = 0;
  let conErrores = 0;
  for (const ruta of guias(join(raiz, 'docs/guias'))) {
    const {data} = matter(readFileSync(ruta, 'utf8'));
    // Los índices (guias/index.md) no son guías: no declaran celda.
    if (!data.area && !data.celda && !data.nivel) continue;
    total += 1;
    const errores = validarFrontmatter(data, competencias);
    if (errores.length) {
      conErrores += 1;
      console.error(`${relative(raiz, ruta)}:`);
      for (const e of errores) console.error(`  - ${e}`);
    }
  }
  if (conErrores) {
    console.error(`Guías: ${conErrores} de ${total} con errores de frontmatter.`);
    process.exit(1);
  }
  console.log(`Guías: frontmatter válido en ${total} de ${total}.`);
}
