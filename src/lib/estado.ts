/**
 * Estado del autodiagnóstico en localStorage. Todo va en try/catch: el almacenamiento puede
 * estar bloqueado (modo privado, política del navegador) y el sitio tiene que funcionar igual.
 */
import type {Competencias, NivelId} from './tipos';
import type {Respuestas} from './diagnostico';
import {codificarRespuestas, decodificarRespuestas, esNivel, versionCuestionario} from './compartir';

export const CLAVE_ESTADO = 'hq-autodiagnostico-v1';

export interface EstadoGuardado {
  respuestas: Respuestas;
  objetivo: NivelId | null;
}

export interface LecturaEstado {
  estado: EstadoGuardado | null;
  /** Había algo guardado, pero de otra versión del cuestionario: se descartó. */
  versionAnterior: boolean;
}

/** Lee el estado guardado. Si la versión no coincide con el cuestionario actual, lo borra y lo avisa. */
export function leerEstado(datos: Competencias): LecturaEstado {
  try {
    const crudo = window.localStorage.getItem(CLAVE_ESTADO);
    if (!crudo) return {estado: null, versionAnterior: false};
    const parsed = JSON.parse(crudo) as {v?: string; r?: string; o?: string | null};
    if (parsed.v !== versionCuestionario(datos)) {
      window.localStorage.removeItem(CLAVE_ESTADO);
      return {estado: null, versionAnterior: true};
    }
    const respuestas = decodificarRespuestas(datos, parsed.r);
    if (!respuestas) return {estado: null, versionAnterior: false};
    return {estado: {respuestas, objetivo: esNivel(parsed.o) ? parsed.o : null}, versionAnterior: false};
  } catch {
    return {estado: null, versionAnterior: false};
  }
}

export function guardarEstado(datos: Competencias, estado: EstadoGuardado): void {
  try {
    window.localStorage.setItem(
      CLAVE_ESTADO,
      JSON.stringify({v: versionCuestionario(datos), r: codificarRespuestas(datos, estado.respuestas), o: estado.objetivo}),
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
