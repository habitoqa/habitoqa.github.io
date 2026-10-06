/**
 * Estado del autodiagnóstico en localStorage. Todo va en try/catch: el almacenamiento puede
 * estar bloqueado (modo privado, política del navegador) y el sitio tiene que funcionar igual.
 */
import type {Competencias, NivelId} from './tipos';
import type {Respuestas} from './diagnostico';
import {codificarRespuestas, decodificarRespuestas, esNivel} from './compartir';

export const CLAVE_ESTADO = 'hq-autodiagnostico-v1';

export interface EstadoGuardado {
  respuestas: Respuestas;
  objetivo: NivelId | null;
}

export function leerEstado(datos: Competencias): EstadoGuardado | null {
  try {
    const crudo = window.localStorage.getItem(CLAVE_ESTADO);
    if (!crudo) return null;
    const parsed = JSON.parse(crudo) as {r?: string; o?: string | null};
    const respuestas = decodificarRespuestas(datos, parsed.r);
    if (!respuestas) return null;
    return {respuestas, objetivo: esNivel(parsed.o) ? parsed.o : null};
  } catch {
    return null;
  }
}

export function guardarEstado(datos: Competencias, estado: EstadoGuardado): void {
  try {
    window.localStorage.setItem(
      CLAVE_ESTADO,
      JSON.stringify({r: codificarRespuestas(datos, estado.respuestas), o: estado.objetivo}),
    );
  } catch {
    /* sin almacenamiento: el diagnóstico sigue funcionando en memoria */
  }
}

export function borrarEstado(): void {
  try {
    window.localStorage.removeItem(CLAVE_ESTADO);
  } catch {
    /* nada que borrar */
  }
}
