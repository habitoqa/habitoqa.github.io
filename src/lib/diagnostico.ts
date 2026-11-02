/**
 * Algoritmo del autodiagnóstico: módulo puro, sin React ni DOM.
 * Reglas: competencias.json > diagnostico (y competencias.md, secciones 7.3 y 7.4).
 *
 * Una respuesta es el índice de la opción dentro de `pregunta.opciones`, en el orden
 * original del JSON (la pantalla las muestra mezcladas, pero el índice no cambia).
 */
import type {Area, Competencias, NivelId, Pregunta} from './tipos';

export const NIVELES: NivelId[] = ['inicial', 'junior', 'semi_senior', 'senior', 'lead'];

/** Valor numérico de cada nivel. "Todavía no hice algo así" vale -1. */
export const VALOR_NIVEL: Record<NivelId, number> = {
  inicial: 0,
  junior: 1,
  semi_senior: 2,
  senior: 3,
  lead: 4,
};

export const VALOR_NINGUNO = -1;

/** idPregunta -> índice de la opción elegida (undefined = sin responder). */
export type Respuestas = Record<string, number | undefined>;

export type EstadoArea = 'sin_datos' | 'sin_empezar' | 'nivel';

export interface Brecha {
  preguntaId: string;
  /** Valor de la opción elegida (menor que el nivel del área). */
  valor: number;
}

export interface ResultadoArea {
  areaId: string;
  estado: EstadoArea;
  /** -1 = todavía sin empezar. null cuando no hay datos suficientes. */
  valor: number | null;
  nivel: NivelId | null;
  total: number;
  respondidas: number;
  validas: number;
  /** Hay 2 niveles o más entre la respuesta más alta y la más baja. */
  desparejo: boolean;
  /** Preguntas respondidas por debajo del nivel del área, de menor a mayor valor. */
  brechas: Brecha[];
  /** Nivel de la celda que sigue (en Lead, la misma celda como mantenimiento). */
  siguiente: NivelId | null;
}

export interface Recomendacion {
  areaId: string;
  resultado: ResultadoArea;
  /** Valor del nivel objetivo menos el nivel del área (con "sin empezar" = -1). */
  brecha: number;
  /** Peso de mercado de la celda objetivo. */
  peso: number;
  prioridadLatam: number;
}

export interface Diagnostico {
  areas: ResultadoArea[];
  /** Nivel objetivo (valor 0 a 4) usado para ordenar. */
  objetivo: NivelId;
  objetivoElegido: boolean;
  /** Áreas con brecha, en el orden de lectura: peso, brecha, prioridad LATAM. */
  recomendaciones: Recomendacion[];
  /** Áreas evaluadas sin brecha. */
  mantenimiento: ResultadoArea[];
  /** Áreas sin respuestas suficientes. */
  sinDatos: ResultadoArea[];
  /** Mediana de los niveles de área (-1 a 4) o null si no hay áreas evaluadas. */
  valorGeneral: number | null;
}

/** Valor de una opción: null si "No aplica" (se excluye del cálculo). */
export function valorOpcion(pregunta: Pregunta, indice: number): number | null {
  const opcion = pregunta.opciones[indice];
  if (!opcion || opcion.nivel === null) return null;
  if (opcion.nivel === 'ninguno') return VALOR_NINGUNO;
  return VALOR_NIVEL[opcion.nivel];
}

/**
 * Mediana redondeada hacia abajo. Cantidad impar: el valor central.
 * Cantidad par: promedio de los dos centrales, redondeado hacia abajo
 * (con 4 respuestas, floor((s[1] + s[2]) / 2)).
 */
export function medianaAbajo(valores: number[]): number {
  if (valores.length === 0) throw new Error('medianaAbajo necesita al menos un valor');
  const s = [...valores].sort((a, b) => a - b);
  const n = s.length;
  if (n % 2 === 1) return s[(n - 1) / 2];
  return Math.floor((s[n / 2 - 1] + s[n / 2]) / 2);
}

export function nivelDeValor(valor: number): NivelId | null {
  return NIVELES.find((n) => VALOR_NIVEL[n] === valor) ?? null;
}

export function siguienteNivel(valor: number): NivelId {
  return NIVELES[Math.min(Math.max(valor + 1, 0), NIVELES.length - 1)];
}

export function calcularArea(
  area: Area,
  respuestas: Respuestas,
  config: Pick<Competencias['diagnostico'], 'minimo_respuestas_validas' | 'umbral_dispersion'>,
): ResultadoArea {
  const valoresPorPregunta: {preguntaId: string; valor: number}[] = [];
  let respondidas = 0;
  for (const pregunta of area.diagnostico) {
    const indice = respuestas[pregunta.id];
    if (indice === undefined) continue;
    respondidas += 1;
    const valor = valorOpcion(pregunta, indice);
    if (valor !== null) valoresPorPregunta.push({preguntaId: pregunta.id, valor});
  }

  const base = {
    areaId: area.id,
    total: area.diagnostico.length,
    respondidas,
    validas: valoresPorPregunta.length,
  };

  if (valoresPorPregunta.length < config.minimo_respuestas_validas) {
    return {
      ...base,
      estado: 'sin_datos',
      valor: null,
      nivel: null,
      desparejo: false,
      brechas: [],
      siguiente: null,
    };
  }

  const valores = valoresPorPregunta.map((v) => v.valor);
  const valor = medianaAbajo(valores);
  const desparejo = Math.max(...valores) - Math.min(...valores) >= config.umbral_dispersion;
  const brechas = valoresPorPregunta
    .filter((v) => v.valor < valor)
    .sort((a, b) => a.valor - b.valor)
    .map(({preguntaId, valor: v}) => ({preguntaId, valor: v}));

  return {
    ...base,
    estado: valor === VALOR_NINGUNO ? 'sin_empezar' : 'nivel',
    valor,
    nivel: nivelDeValor(valor),
    desparejo,
    brechas,
    siguiente: siguienteNivel(valor),
  };
}

function celdaPeso(area: Area, nivel: NivelId, pesos: Record<string, number>): number {
  const celda = area.celdas.find((c) => c.nivel === nivel);
  return celda?.peso_mercado ?? pesos.sin_tema ?? 1;
}

/**
 * Calcula el nivel de cada área y ordena las recomendaciones.
 * Orden: peso de mercado de la celda objetivo (mayor primero), brecha (mayor primero),
 * prioridad para LATAM hispano (menor número primero).
 */
export function diagnosticar(
  datos: Competencias,
  respuestas: Respuestas,
  objetivoElegido?: NivelId | null,
): Diagnostico {
  const areas = datos.areas.map((a) => calcularArea(a, respuestas, datos.diagnostico));
  const evaluadas = areas.filter((r) => r.valor !== null);

  const valorGeneral = evaluadas.length ? medianaAbajo(evaluadas.map((r) => r.valor as number)) : null;

  let valorObjetivo: number;
  if (objetivoElegido) {
    valorObjetivo = VALOR_NIVEL[objetivoElegido];
  } else if (valorGeneral !== null) {
    valorObjetivo = Math.min(valorGeneral + 1, 4);
  } else {
    valorObjetivo = 0;
  }
  const objetivo = nivelDeValor(valorObjetivo) as NivelId;

  const recomendaciones: Recomendacion[] = [];
  const mantenimiento: ResultadoArea[] = [];
  for (const resultado of evaluadas) {
    const area = datos.areas.find((a) => a.id === resultado.areaId) as Area;
    const brecha = valorObjetivo - (resultado.valor as number);
    if (brecha > 0) {
      recomendaciones.push({
        areaId: area.id,
        resultado,
        brecha,
        peso: celdaPeso(area, objetivo, datos.diagnostico.peso_mercado),
        prioridadLatam: area.prioridad_latam,
      });
    } else {
      mantenimiento.push(resultado);
    }
  }

  recomendaciones.sort(
    (a, b) => b.peso - a.peso || b.brecha - a.brecha || a.prioridadLatam - b.prioridadLatam,
  );
  mantenimiento.sort(
    (a, b) =>
      (datos.areas.find((x) => x.id === a.areaId) as Area).prioridad_latam -
      (datos.areas.find((x) => x.id === b.areaId) as Area).prioridad_latam,
  );

  return {
    areas,
    objetivo,
    objetivoElegido: Boolean(objetivoElegido),
    recomendaciones,
    mantenimiento,
    sinDatos: areas.filter((r) => r.valor === null),
    valorGeneral,
  };
}
