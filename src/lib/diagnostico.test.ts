import {describe, expect, it} from 'vitest';
import datos from '../data/competencias.json';
import type {Area, Competencias, NivelId} from './tipos';
import {
  calcularArea,
  diagnosticar,
  medianaAbajo,
  VALOR_NIVEL,
  type Respuestas,
} from './diagnostico';
import {codificarRespuestas, decodificarRespuestas, construirQuery, leerQuery} from './compartir';

const competencias = datos as unknown as Competencias;
const cfg = competencias.diagnostico;
const area = (id: string) => competencias.areas.find((a) => a.id === id) as Area;

type Eleccion = NivelId | 'ninguno' | 'noaplica';

/** Índice de la primera opción que corresponde a esa elección. */
function indiceOpcion(areaId: string, pregunta: number, eleccion: Eleccion): number {
  const opciones = area(areaId).diagnostico[pregunta].opciones;
  const i = opciones.findIndex((o) => (eleccion === 'noaplica' ? o.nivel === null : o.nivel === eleccion));
  if (i < 0) throw new Error(`${areaId} pregunta ${pregunta + 1} no tiene opción ${eleccion}`);
  return i;
}

/** Arma las respuestas de un área a partir de una lista de elecciones, en orden de pregunta. */
function responder(areaId: string, elecciones: Eleccion[]): Respuestas {
  const r: Respuestas = {};
  elecciones.forEach((e, i) => {
    r[area(areaId).diagnostico[i].id] = indiceOpcion(areaId, i, e);
  });
  return r;
}

/**
 * Respuestas de un área cuyo nivel resultante es `nivel`. No todas las preguntas tienen
 * una opción de cada nivel, así que se busca (por fuerza bruta, hasta 5^4 combinaciones)
 * una combinación de opciones de nivel cuya mediana dé ese valor.
 */
function areaEn(areaId: string, nivel: NivelId): Respuestas {
  const preguntas = area(areaId).diagnostico;
  const opciones = preguntas.map((p) =>
    p.opciones.map((o, i) => ({i, v: o.nivel && o.nivel !== 'ninguno' ? VALOR_NIVEL[o.nivel] : null})).filter((x) => x.v !== null),
  );
  const probar = (k: number, acc: number[]): number[] | null => {
    if (k === preguntas.length) return medianaAbajo(acc.map((i, q) => opciones[q].find((x) => x.i === i)!.v as number)) === VALOR_NIVEL[nivel] ? acc : null;
    for (const o of opciones[k]) {
      const r = probar(k + 1, [...acc, o.i]);
      if (r) return r;
    }
    return null;
  };
  const combo = probar(0, []);
  if (!combo) throw new Error(`${areaId} no puede dar ${nivel}`);
  return Object.fromEntries(preguntas.map((p, q) => [p.id, combo[q]]));
}

/** Todas las áreas con el mismo nivel resultante. */
function todasEn(nivel: NivelId): Respuestas {
  return competencias.areas.reduce<Respuestas>((acc, a) => ({...acc, ...areaEn(a.id, nivel)}), {});
}

describe('medianaAbajo', () => {
  it('toma el valor central con cantidad impar', () => {
    expect(medianaAbajo([3, 0, 1])).toBe(1);
  });
  it('redondea hacia abajo el promedio de los dos centrales (4 respuestas)', () => {
    expect(medianaAbajo([1, 1, 3, 3])).toBe(2);
    expect(medianaAbajo([0, 1, 1, 3])).toBe(1);
    expect(medianaAbajo([4, 4, 4, 0])).toBe(4);
  });
  it('con "todavía no" (-1) y Inicial redondea a -1', () => {
    expect(medianaAbajo([-1, 0])).toBe(-1);
  });
});

describe('nivel por área', () => {
  it('Junior, Junior, Senior, Senior da Semi Senior y marca perfil desparejo', () => {
    const r = calcularArea(area('ui'), responder('ui', ['junior', 'junior', 'senior', 'senior']), cfg);
    expect(r.nivel).toBe('semi_senior');
    expect(r.valor).toBe(VALOR_NIVEL.semi_senior);
    expect(r.desparejo).toBe(true);
    expect(r.siguiente).toBe('senior');
    // las preguntas por debajo del nivel del área son las dos de Junior
    expect(r.brechas.map((b) => b.valor)).toEqual([1, 1]);
  });

  it('ejemplo de competencias.md 7.3: Semi Senior, Junior, Semi Senior, Senior da Semi Senior desparejo', () => {
    const r = calcularArea(area('ui'), responder('ui', ['semi_senior', 'junior', 'semi_senior', 'senior']), cfg);
    expect(r.nivel).toBe('semi_senior');
    expect(r.desparejo).toBe(true);
    expect(r.brechas).toEqual([{preguntaId: 'ui-2', valor: 1}]);
  });

  it('todo en el máximo da Lead, sin brechas y con la misma celda como mantenimiento', () => {
    const r = calcularArea(area('cicd'), responder('cicd', ['lead', 'lead', 'lead', 'lead']), cfg);
    expect(r.nivel).toBe('lead');
    expect(r.desparejo).toBe(false);
    expect(r.brechas).toEqual([]);
    expect(r.siguiente).toBe('lead');
  });

  it('todo en el mínimo (Inicial) da Inicial, no "sin empezar"', () => {
    const r = calcularArea(area('api'), responder('api', ['inicial', 'inicial', 'inicial', 'inicial']), cfg);
    expect(r.estado).toBe('nivel');
    expect(r.nivel).toBe('inicial');
    expect(r.siguiente).toBe('junior');
  });

  it('"Todavía no hice algo así" en casi todo deja el área sin empezar', () => {
    const r = calcularArea(area('ui'), responder('ui', ['ninguno', 'ninguno', 'ninguno', 'inicial']), cfg);
    expect(r.estado).toBe('sin_empezar');
    expect(r.valor).toBe(-1);
    expect(r.nivel).toBeNull();
    expect(r.siguiente).toBe('inicial');
  });

  it('"Todavía no" cuenta como respuesta válida y baja la mediana', () => {
    const r = calcularArea(area('ui'), responder('ui', ['ninguno', 'junior', 'junior', 'junior']), cfg);
    expect(r.validas).toBe(4);
    expect(r.nivel).toBe('junior');
    expect(r.desparejo).toBe(true); // de -1 a 1 hay 2 niveles
    expect(r.brechas).toEqual([{preguntaId: 'ui-1', valor: -1}]);
  });

  it('"No aplica" se excluye del cálculo', () => {
    const r = calcularArea(area('ui'), responder('ui', ['senior', 'senior', 'senior', 'noaplica']), cfg);
    expect(r.respondidas).toBe(4);
    expect(r.validas).toBe(3);
    expect(r.nivel).toBe('senior');
  });

  it('con menos de 2 respuestas válidas el área queda sin datos suficientes', () => {
    const r = calcularArea(area('ui'), responder('ui', ['senior', 'noaplica', 'noaplica', 'noaplica']), cfg);
    expect(r.estado).toBe('sin_datos');
    expect(r.nivel).toBeNull();
    expect(r.validas).toBe(1);
    const vacia = calcularArea(area('ui'), {}, cfg);
    expect(vacia.estado).toBe('sin_datos');
  });

  it('se puede evaluar con respuestas parciales (por partes)', () => {
    const r = calcularArea(area('ui'), responder('ui', ['junior', 'semi_senior']), cfg);
    expect(r.estado).toBe('nivel');
    expect(r.respondidas).toBe(2);
    expect(r.nivel).toBe('junior'); // floor((1 + 2) / 2)
  });
});

describe('orden de recomendaciones (competencias.md 7.4)', () => {
  // Semi Senior en todo salvo performance y seguridad/accesibilidad (Junior), objetivo Senior.
  const respuestas: Respuestas = {
    ...todasEn('semi_senior'),
    ...areaEn('performance', 'junior'),
    ...areaEn('seg_acc', 'junior'),
  };

  it('ordena por peso de mercado, después brecha, después prioridad LATAM', () => {
    const d = diagnosticar(competencias, respuestas, 'senior');
    expect(d.objetivo).toBe('senior');
    expect(d.recomendaciones.map((r) => r.areaId)).toEqual([
      // requeridos en Senior, brecha 1
      'ui',
      'cicd',
      'api',
      'ingles',
      // diferenciales, brecha 2
      'performance',
      'seg_acc',
      // diferenciales, brecha 1
      'diseno',
      'datos',
      'estrategia',
      'ia',
      'exploratorio',
      // sin tema de mercado
      'calt',
    ]);
    expect(d.mantenimiento).toEqual([]);
  });

  it('sin objetivo elegido toma la mediana de las áreas más uno (Semi Senior -> Senior)', () => {
    const d = diagnosticar(competencias, respuestas);
    expect(d.objetivo).toBe('senior');
    expect(d.objetivoElegido).toBe(false);
    expect(d.recomendaciones[0].areaId).toBe('ui');
  });

  it('el peso va antes que la brecha: performance (2x2) no le gana a CI/CD (1x3)', () => {
    const d = diagnosticar(competencias, respuestas, 'senior');
    const orden = d.recomendaciones.map((r) => r.areaId);
    expect(orden.indexOf('cicd')).toBeLessThan(orden.indexOf('performance'));
  });

  it('las áreas sin brecha pasan a mantenimiento y las no evaluadas a sinDatos', () => {
    const solo = {...responder('ui', ['lead', 'lead', 'lead', 'lead']), ...responder('cicd', ['junior', 'junior', 'junior', 'junior'])};
    const d = diagnosticar(competencias, solo, 'lead');
    expect(d.mantenimiento.map((r) => r.areaId)).toEqual(['ui']);
    expect(d.recomendaciones.map((r) => r.areaId)).toEqual(['cicd']);
    expect(d.sinDatos).toHaveLength(competencias.areas.length - 2);
  });

  it('Inicial parejo: todo pesa 1 y el orden lo define la prioridad LATAM', () => {
    const d = diagnosticar(competencias, todasEn('inicial'), 'junior');
    const ids = d.recomendaciones.map((r) => r.areaId);
    const esperado = [...competencias.areas].sort((a, b) => a.prioridad_latam - b.prioridad_latam).map((a) => a.id);
    expect(ids).toEqual(esperado);
  });
});

describe('URL compartible', () => {
  it('codifica y decodifica sin perder respuestas (ida y vuelta)', () => {
    const r = {...responder('ui', ['junior', 'ninguno', 'noaplica', 'lead']), ...responder('seg_acc', ['senior', 'senior'])};
    const codigo = codificarRespuestas(competencias, r);
    expect(codigo).toHaveLength(46);
    expect(codigo).toMatch(/^[0-9-]+$/);
    expect(decodificarRespuestas(competencias, codigo)).toEqual(r);
  });

  it('rechaza códigos de otro largo o con caracteres inválidos o fuera de rango', () => {
    expect(decodificarRespuestas(competencias, 'abc')).toBeNull();
    expect(decodificarRespuestas(competencias, null)).toBeNull();
    expect(decodificarRespuestas(competencias, 'x'.repeat(46))).toBeNull();
    expect(decodificarRespuestas(competencias, '9'.repeat(46))).toBeNull();
  });

  it('lleva el nivel objetivo en la query y descarta valores inválidos', () => {
    const r = responder('ui', ['junior', 'junior']);
    const q = construirQuery(competencias, r, 'senior');
    expect(leerQuery(competencias, `?${q}`)).toEqual({respuestas: r, objetivo: 'senior'});
    expect(leerQuery(competencias, `?r=${'-'.repeat(46)}&o=jefe`)).toEqual({respuestas: {}, objetivo: null});
    expect(leerQuery(competencias, '?o=senior')).toBeNull();
  });
});

describe('integridad del JSON para el autodiagnóstico', () => {
  it('cada pregunta termina con las dos opciones fijas y tiene al menos 3 opciones de nivel', () => {
    for (const a of competencias.areas) {
      for (const p of a.diagnostico) {
        const n = p.opciones.length;
        expect(p.opciones[n - 2].nivel).toBe('ninguno');
        expect(p.opciones[n - 1].nivel).toBeNull();
        expect(n - 2).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('cada área puede dar cualquier nivel de Inicial a Lead', () => {
    for (const a of competencias.areas) {
      for (const nivel of ['inicial', 'junior', 'semi_senior', 'senior', 'lead'] as NivelId[]) {
        const r = calcularArea(a, areaEn(a.id, nivel), cfg);
        expect(r.nivel, `${a.id} ${nivel}`).toBe(nivel);
      }
    }
  });
});
