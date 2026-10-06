import datos from '../data/competencias.json';
import type {Area, Celda, Competencias, NivelId} from './tipos';

export const competencias = datos as unknown as Competencias;

/** Ancla de una celda del mapa: `<area>-<nivel>` con guiones (ui-semi-senior, seg-acc-lead). */
export function anclaCelda(areaId: string, nivel: NivelId): string {
  return `${areaId}-${nivel}`.replace(/_/g, '-');
}

export function linkCelda(areaId: string, nivel: NivelId): string {
  return `/mapa#${anclaCelda(areaId, nivel)}`;
}

export function nombreNivel(nivel: NivelId): string {
  return competencias.niveles.find((n) => n.id === nivel)?.nombre ?? nivel;
}

export function buscarArea(id: string): Area | undefined {
  return competencias.areas.find((a) => a.id === id);
}

export function buscarCelda(areaId: string, nivel: NivelId): Celda | undefined {
  return buscarArea(areaId)?.celdas.find((c) => c.nivel === nivel);
}

export function buscarRecurso(id: string) {
  return competencias.recursos.find((r) => r.id === id);
}
