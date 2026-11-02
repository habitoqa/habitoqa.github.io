/**
 * Competencias mínimas para probar el algoritmo sin depender del JSON real (que cambia con el contenido).
 * 4 áreas con prioridad 1 a 4; las tres primeras con 4 preguntas y la última con 3.
 * Pesos de mercado por celda: a1 y a2 pesan 3 y 2 en Senior; a3 pesa 2; a4 pesa 1. El resto, 1.
 * Cada pregunta tiene una opción por nivel (en orden), "Todavía no" y "No aplica".
 */
import type {Area, Celda, Competencias, NivelId, Pregunta} from './tipos';

const NIVELES: NivelId[] = ['inicial', 'junior', 'semi_senior', 'senior', 'lead'];

function pregunta(areaId: string, n: number): Pregunta {
  return {
    id: `${areaId}-${n}`,
    enunciado: `Pregunta ${n} del área ${areaId}`,
    opciones: [
      ...NIVELES.map((nivel) => ({texto: `${areaId}-${n} como ${nivel}`, nivel})),
      {texto: 'Todavía no hice algo así.', nivel: 'ninguno' as const},
      {texto: 'No aplica a mi trabajo actual.', nivel: null},
    ],
  };
}

function area(id: string, prioridad: number, preguntas: number, pesoSenior: number): Area {
  const celdas: Celda[] = NIVELES.map((nivel) => ({
    nivel,
    comportamientos: [{id: `${id}.${nivel}.1`, texto: `Comportamiento ${nivel} de ${id}`}],
    evidencia: `Evidencia ${nivel} de ${id}`,
    respaldo: {mercado: []},
    recursos: [],
    peso_mercado: nivel === 'senior' ? pesoSenior : 1,
  }));
  return {
    id,
    nombre: `Área ${id}`,
    prioridad_latam: prioridad,
    resumen: `Resumen de ${id}`,
    celdas,
    diagnostico: Array.from({length: preguntas}, (_, i) => pregunta(id, i + 1)),
  };
}

export const sintetico: Competencias = {
  niveles: NIVELES.map((id, orden) => ({id, nombre: id, orden})),
  recursos: [],
  areas: [area('a1', 1, 4, 3), area('a2', 2, 4, 2), area('a3', 3, 4, 2), area('a4', 4, 3, 1)],
  diagnostico: {
    minimo_respuestas_validas: 2,
    umbral_dispersion: 2,
    peso_mercado: {requerido: 3, diferencial: 2, marginal: 1, no_aplica: 0, evidencia_insuficiente: 1, sin_tema: 1},
  },
};
