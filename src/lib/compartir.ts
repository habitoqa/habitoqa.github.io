/**
 * Codificación del resultado para la URL compartible. Sin datos personales:
 * solo el índice de la opción elegida en cada pregunta, en el orden del JSON.
 *
 *   /autodiagnostico/resultado?v=1a2b3c4d&r=3-12...&o=senior
 *
 * `v` es la versión del cuestionario: un hash corto de los ids de pregunta y del nivel de cada opción.
 * Si cambian las preguntas o el orden de las opciones, los índices guardados ya no significan lo mismo,
 * y un link o un estado local con otra versión se descarta en lugar de mostrar un resultado equivocado.
 * `r` tiene un carácter por pregunta (las 46 en orden de área): un dígito (índice
 * de la opción) o "-" si no se respondió. `o` es el nivel objetivo, opcional.
 */
import type {Competencias, NivelId} from './tipos';
import type {Respuestas} from './diagnostico';
import {NIVELES} from './diagnostico';

const SIN_RESPUESTA = '-';

/** Versión del cuestionario: FNV-1a de 32 bits sobre los ids de pregunta y el nivel de cada opción, en hexadecimal. */
export function versionCuestionario(datos: Competencias): string {
  const texto = todasLasPreguntas(datos)
    .map((p) => `${p.id}:${p.opciones.map((o) => (o.nivel === null ? 'x' : o.nivel)).join(',')}`)
    .join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i += 1) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function todasLasPreguntas(datos: Competencias) {
  return datos.areas.flatMap((a) => a.diagnostico);
}

export function codificarRespuestas(datos: Competencias, respuestas: Respuestas): string {
  return todasLasPreguntas(datos)
    .map((p) => {
      const r = respuestas[p.id];
      return r === undefined ? SIN_RESPUESTA : String(r);
    })
    .join('');
}

/** Devuelve null si el código no corresponde a este cuestionario. */
export function decodificarRespuestas(datos: Competencias, codigo: string | null | undefined): Respuestas | null {
  if (!codigo) return null;
  const preguntas = todasLasPreguntas(datos);
  if (codigo.length !== preguntas.length) return null;
  const respuestas: Respuestas = {};
  for (let i = 0; i < preguntas.length; i += 1) {
    const c = codigo[i];
    if (c === SIN_RESPUESTA) continue;
    if (!/^[0-9]$/.test(c)) return null;
    const indice = Number(c);
    if (indice >= preguntas[i].opciones.length) return null;
    respuestas[preguntas[i].id] = indice;
  }
  return respuestas;
}

export function esNivel(valor: string | null | undefined): valor is NivelId {
  return NIVELES.includes(valor as NivelId);
}

export function construirQuery(datos: Competencias, respuestas: Respuestas, objetivo: NivelId | null): string {
  const params = new URLSearchParams({v: versionCuestionario(datos), r: codificarRespuestas(datos, respuestas)});
  if (objetivo) params.set('o', objetivo);
  return params.toString();
}

export type LecturaQuery =
  | {ok: true; respuestas: Respuestas; objetivo: NivelId | null}
  | {ok: false; motivo: 'invalido' | 'version'};

export function leerQuery(datos: Competencias, search: string): LecturaQuery {
  const params = new URLSearchParams(search);
  if (!params.get('r')) return {ok: false, motivo: 'invalido'};
  // Un link sin `v` o con otra versión viene de otro cuestionario: no se interpreta.
  if (params.get('v') !== versionCuestionario(datos)) return {ok: false, motivo: 'version'};
  const respuestas = decodificarRespuestas(datos, params.get('r'));
  if (!respuestas) return {ok: false, motivo: 'invalido'};
  const o = params.get('o');
  return {ok: true, respuestas, objetivo: esNivel(o) ? o : null};
}
