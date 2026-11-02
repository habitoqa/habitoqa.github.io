#!/usr/bin/env node
/**
 * Valida el esquema de src/data/competencias.json (habitoqa.competencias). Falla el CI si algo no cierra.
 * Reglas de integridad de competencias.md (sección 7): 5 celdas por área en orden de nivel, ids de
 * comportamiento únicos y estables, recursos que existen, preguntas con las dos opciones fijas al final.
 */
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const NIVELES = ['inicial', 'junior', 'semi_senior', 'senior', 'lead'];
const ID_COMPORTAMIENTO = /^[a-z_]+\.(inicial|junior|semi_senior|senior|lead)\.(?:[a-z]+\.)?\d+$/;

export function validarCompetencias(d) {
  const errores = [];
  const err = (m) => errores.push(m);
  const texto = (v) => typeof v === 'string' && v.trim().length > 0;

  if (d.esquema !== 'habitoqa.competencias') err(`esquema: se esperaba "habitoqa.competencias" y es ${JSON.stringify(d.esquema)}`);
  if (!texto(d.version)) err('version: falta');

  if (!Array.isArray(d.niveles) || d.niveles.map((n) => n.id).join() !== NIVELES.join()) {
    err(`niveles: tienen que ser ${NIVELES.join(', ')} en ese orden`);
  } else {
    d.niveles.forEach((n, i) => {
      if (n.orden !== i) err(`niveles.${n.id}: orden ${n.orden}, se esperaba ${i}`);
      if (!texto(n.nombre)) err(`niveles.${n.id}: falta nombre`);
    });
  }

  const recursos = new Set();
  for (const r of d.recursos ?? []) {
    if (!texto(r.id)) err('recursos: un recurso sin id');
    if (recursos.has(r.id)) err(`recursos: id repetido ${r.id}`);
    recursos.add(r.id);
    if (!texto(r.titulo)) err(`recursos.${r.id}: falta titulo`);
    if (!/^https?:\/\//.test(r.url ?? '')) err(`recursos.${r.id}: url inválida`);
  }

  const d0 = d.diagnostico ?? {};
  for (const clave of ['minimo_respuestas_validas', 'umbral_dispersion']) {
    if (!Number.isInteger(d0[clave])) err(`diagnostico.${clave}: tiene que ser un entero`);
  }
  for (const n of NIVELES) {
    if (d0.valores?.[n] !== NIVELES.indexOf(n)) err(`diagnostico.valores.${n}: se esperaba ${NIVELES.indexOf(n)}`);
  }
  if (d0.valores?.ninguno !== -1) err('diagnostico.valores.ninguno: se esperaba -1');
  for (const c of ['requerido', 'diferencial', 'marginal', 'no_aplica', 'evidencia_insuficiente', 'sin_tema']) {
    if (!Number.isInteger(d0.peso_mercado?.[c])) err(`diagnostico.peso_mercado.${c}: falta`);
  }

  const areas = d.areas ?? [];
  if (areas.length === 0) err('areas: vacío');
  const idsArea = new Set();
  const prioridades = new Set();
  const idsComportamiento = new Set();
  const idsPregunta = new Set();

  for (const a of areas) {
    const ctx = `areas.${a.id}`;
    if (!/^[a-z_]+$/.test(a.id ?? '')) err(`${ctx}: id inválido`);
    if (idsArea.has(a.id)) err(`${ctx}: id repetido`);
    idsArea.add(a.id);
    if (!texto(a.nombre)) err(`${ctx}: falta nombre`);
    if (!texto(a.resumen)) err(`${ctx}: falta resumen`);
    if (!Number.isInteger(a.prioridad_latam)) err(`${ctx}: prioridad_latam inválida`);
    if (prioridades.has(a.prioridad_latam)) err(`${ctx}: prioridad_latam repetida (${a.prioridad_latam})`);
    prioridades.add(a.prioridad_latam);

    if (a.celdas?.map((c) => c.nivel).join() !== NIVELES.join()) err(`${ctx}.celdas: tienen que ser 5, una por nivel y en orden`);
    for (const c of a.celdas ?? []) {
      const cc = `${ctx}.${c.nivel}`;
      if (!c.comportamientos?.length) err(`${cc}: sin comportamientos`);
      for (const [i, b] of (c.comportamientos ?? []).entries()) {
        if (!ID_COMPORTAMIENTO.test(b.id ?? '')) err(`${cc}: id de comportamiento inválido ${JSON.stringify(b.id)}`);
        else if (b.id !== `${a.id}.${c.nivel}.${i + 1}`) err(`${cc}: se esperaba el id ${a.id}.${c.nivel}.${i + 1} y es ${b.id}`);
        if (idsComportamiento.has(b.id)) err(`${cc}: id de comportamiento repetido ${b.id}`);
        idsComportamiento.add(b.id);
        if (!texto(b.texto)) err(`${cc}: ${b.id} sin texto`);
      }
      for (const b of c.comportamientos_variante ?? []) {
        if (idsComportamiento.has(b.id)) err(`${cc}: id de variante repetido ${b.id}`);
        idsComportamiento.add(b.id);
      }
      if (!texto(c.evidencia)) err(`${cc}: falta evidencia`);
      if (![0, 1, 2, 3].includes(c.peso_mercado)) err(`${cc}: peso_mercado ${c.peso_mercado} fuera de 0 a 3`);
      if (!Array.isArray(c.respaldo?.mercado)) err(`${cc}: falta respaldo.mercado`);
      for (const r of [...(c.recursos ?? []), ...(c.respaldo?.bibliografia ?? [])]) {
        if (!recursos.has(r.recurso)) err(`${cc}: el recurso ${r.recurso} no existe en recursos`);
      }
    }

    const preguntas = a.diagnostico ?? [];
    if (preguntas.length < 3 || preguntas.length > 4) err(`${ctx}.diagnostico: ${preguntas.length} preguntas (tienen que ser 3 o 4)`);
    for (const p of preguntas) {
      const pc = `${ctx}.${p.id}`;
      if (idsPregunta.has(p.id)) err(`${pc}: id de pregunta repetido`);
      idsPregunta.add(p.id);
      if (!texto(p.enunciado)) err(`${pc}: falta enunciado`);
      const o = p.opciones ?? [];
      if (o.length < 5) err(`${pc}: menos de 3 opciones de nivel`);
      else {
        if (o.at(-2).nivel !== 'ninguno') err(`${pc}: la penúltima opción tiene que ser "Todavía no" (nivel ninguno)`);
        if (o.at(-1).nivel !== null) err(`${pc}: la última opción tiene que ser "No aplica" (nivel null)`);
        for (const x of o.slice(0, -2)) {
          if (!NIVELES.includes(x.nivel)) err(`${pc}: nivel de opción inválido ${JSON.stringify(x.nivel)}`);
          if (!texto(x.texto)) err(`${pc}: opción sin texto`);
        }
      }
    }
    // Techos: en áreas de 4 preguntas, 3 con opción Lead y 3 con Inicial (2 y 2 en las de 3).
    const minimo = preguntas.length === 4 ? 3 : 2;
    for (const nivel of ['lead', 'inicial']) {
      const n = preguntas.filter((p) => p.opciones?.some((x) => x.nivel === nivel)).length;
      if (n < minimo) err(`${ctx}: solo ${n} pregunta(s) con opción ${nivel} (mínimo ${minimo})`);
    }
  }
  return errores;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const datos = JSON.parse(readFileSync(join(raiz, 'src/data/competencias.json'), 'utf8'));
  const errores = validarCompetencias(datos);
  if (errores.length) {
    console.error(`competencias.json: ${errores.length} error(es)`);
    for (const e of errores) console.error(`  - ${e}`);
    process.exit(1);
  }
  const celdas = datos.areas.reduce((n, a) => n + a.celdas.length, 0);
  const preguntas = datos.areas.reduce((n, a) => n + a.diagnostico.length, 0);
  console.log(`competencias.json válido: ${datos.areas.length} áreas, ${celdas} celdas, ${preguntas} preguntas, ${datos.recursos.length} recursos.`);
}
