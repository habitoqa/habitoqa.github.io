/**
 * Codificación del resultado para la URL compartible. Sin datos personales:
 * solo el índice de la opción elegida en cada pregunta, en el orden del JSON.
 *
 *   /autodiagnostico/resultado?r=3-12...&o=senior
 *
 * `r` tiene un carácter por pregunta (las 46 en orden de área): un dígito (índice
 * de la opción) o "-" si no se respondió. `o` es el nivel objetivo, opcional.
 */
import type {Competencias, NivelId} from './tipos';
import type {Respuestas} from './diagnostico';
import {NIVELES} from './diagnostico';

const SIN_RESPUESTA = '-';

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
  const params = new URLSearchParams({r: codificarRespuestas(datos, respuestas)});
  if (objetivo) params.set('o', objetivo);
  return params.toString();
}

export function leerQuery(
  datos: Competencias,
  search: string,
): {respuestas: Respuestas; objetivo: NivelId | null} | null {
  const params = new URLSearchParams(search);
  const respuestas = decodificarRespuestas(datos, params.get('r'));
  if (!respuestas) return null;
  const o = params.get('o');
  return {respuestas, objetivo: esNivel(o) ? o : null};
}
