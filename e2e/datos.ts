/**
 * Datos de los tests derivados de las fuentes de verdad del sitio (competencias.json y el frontmatter
 * de las guías), para no repetir en los tests el texto de las preguntas ni los conteos.
 */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import matter from 'gray-matter';
import competencias from '../src/data/competencias.json';

export type NivelId = 'inicial' | 'junior' | 'semi_senior' | 'senior' | 'lead';

export const AREAS = competencias.areas;
export const TOTAL_PREGUNTAS = AREAS.reduce((n, a) => n + a.diagnostico.length, 0);

export const area = (id: string) => {
  const a = AREAS.find((x) => x.id === id);
  if (!a) throw new Error(`No existe el área ${id}`);
  return a;
};

export const nombreNivel = (id: NivelId) => {
  const n = competencias.niveles.find((x) => x.id === id);
  if (!n) throw new Error(`No existe el nivel ${id}`);
  return n.nombre;
};

export const celda = (areaId: string, nivel: NivelId) => {
  const c = area(areaId).celdas.find((x) => x.nivel === nivel);
  if (!c) throw new Error(`No existe la celda ${areaId}.${nivel}`);
  return c;
};

/** Pregunta `indice` (desde 0) del área, y el texto de su opción de ese nivel. */
export function opcion(areaId: string, indice: number, nivel: NivelId) {
  const pregunta = area(areaId).diagnostico[indice];
  const o = pregunta.opciones.find((x) => x.nivel === nivel);
  if (!o) throw new Error(`${pregunta.id} no tiene opción ${nivel}`);
  return {enunciado: pregunta.enunciado, texto: o.texto};
}

export const textoComportamiento = (id: string) => {
  for (const a of AREAS) for (const c of a.celdas) for (const b of c.comportamientos) if (b.id === id) return b.texto;
  throw new Error(`No existe el comportamiento ${id}`);
};

/** Frontmatter de una guía (ruta relativa a docs/). */
export function frontmatterGuia(ruta: string) {
  return matter(readFileSync(join(__dirname, '..', 'docs', ruta), 'utf8')).data as {
    title: string;
    area: string;
    nivel: NivelId;
    celda: string;
    comportamientos: string[];
  };
}

export const GUIAS = [
  {ruta: 'guias/ui/diagnosticar-un-test-inestable.mdx', url: '/guias/ui/diagnosticar-un-test-inestable'},
  {ruta: 'guias/cicd/github-actions-como-gate.mdx', url: '/guias/cicd/github-actions-como-gate'},
  {ruta: 'guias/ingles/como-redactar-un-defecto.mdx', url: '/guias/ingles/como-redactar-un-defecto'},
];

/** Ancla de una celda del mapa. */
export const ancla = (areaId: string, nivel: NivelId) => `${areaId}-${nivel}`.replace(/_/g, '-');
