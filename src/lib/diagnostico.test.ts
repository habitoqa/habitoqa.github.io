import {describe, expect, it} from 'vitest';
import type {Area, NivelId} from './tipos';
import {calcularArea, diagnosticar, medianaAbajo, VALOR_NIVEL, type Respuestas} from './diagnostico';
import {sintetico as datos} from './competencias.sintetico';

const cfg = datos.diagnostico;
const area = (id: string) => datos.areas.find((a) => a.id === id) as Area;

type Eleccion = NivelId | 'ninguno' | 'noaplica';

function indiceOpcion(areaId: string, pregunta: number, eleccion: Eleccion): number {
  const opciones = area(areaId).diagnostico[pregunta].opciones;
  return opciones.findIndex((o) => (eleccion === 'noaplica' ? o.nivel === null : o.nivel === eleccion));
}

/** Respuestas de un área a partir de una elección por pregunta (en orden). */
function responder(areaId: string, elecciones: Eleccion[]): Respuestas {
  const r: Respuestas = {};
  elecciones.forEach((e, i) => {
    r[area(areaId).diagnostico[i].id] = indiceOpcion(areaId, i, e);
  });
  return r;
}

/** Todas las preguntas de un área con la misma elección. */
const parejo = (areaId: string, e: Eleccion) =>
  responder(areaId, area(areaId).diagnostico.map(() => e));

/** Todas las áreas con la misma elección. */
const todas = (e: Eleccion): Respuestas =>
  datos.areas.reduce<Respuestas>((acc, a) => ({...acc, ...parejo(a.id, e)}), {});

describe('medianaAbajo', () => {
  it('toma el valor central con cantidad impar', () => expect(medianaAbajo([3, 0, 1])).toBe(1));
  it('redondea hacia abajo el promedio de los dos centrales', () => {
    expect(medianaAbajo([1, 1, 3, 3])).toBe(2);
    expect(medianaAbajo([0, 1, 1, 3])).toBe(1);
    expect(medianaAbajo([4, 4, 4, 0])).toBe(4);
  });
  it('con -1 y 0 redondea a -1', () => expect(medianaAbajo([-1, 0])).toBe(-1));
});

describe('nivel por área', () => {
  it('Junior, Junior, Senior, Senior da Semi Senior y marca perfil desparejo', () => {
    const r = calcularArea(area('a1'), responder('a1', ['junior', 'junior', 'senior', 'senior']), cfg);
    expect(r.nivel).toBe('semi_senior');
    expect(r.valor).toBe(VALOR_NIVEL.semi_senior);
    expect(r.desparejo).toBe(true);
    expect(r.siguiente).toBe('senior');
    expect(r.brechas.map((b) => b.valor)).toEqual([1, 1]);
  });

  it('Semi Senior, Junior, Semi Senior, Senior: Semi Senior desparejo con una brecha', () => {
    const r = calcularArea(area('a1'), responder('a1', ['semi_senior', 'junior', 'semi_senior', 'senior']), cfg);
    expect(r.nivel).toBe('semi_senior');
    expect(r.desparejo).toBe(true);
    expect(r.brechas).toEqual([{preguntaId: 'a1-2', valor: 1}]);
  });

  it('todo en el máximo da Lead, sin brechas y con la misma celda como mantenimiento', () => {
    const r = calcularArea(area('a1'), parejo('a1', 'lead'), cfg);
    expect(r.nivel).toBe('lead');
    expect(r.desparejo).toBe(false);
    expect(r.brechas).toEqual([]);
    expect(r.siguiente).toBe('lead');
  });

  it('todo en el mínimo (Inicial) da Inicial, no "sin empezar"', () => {
    const r = calcularArea(area('a1'), parejo('a1', 'inicial'), cfg);
    expect(r.estado).toBe('nivel');
    expect(r.nivel).toBe('inicial');
    expect(r.siguiente).toBe('junior');
  });

  it('"Todavía no hice algo así" en casi todo deja el área sin empezar', () => {
    const r = calcularArea(area('a1'), responder('a1', ['ninguno', 'ninguno', 'ninguno', 'inicial']), cfg);
    expect(r.estado).toBe('sin_empezar');
    expect(r.valor).toBe(-1);
    expect(r.nivel).toBeNull();
    expect(r.siguiente).toBe('inicial');
  });

  it('"Todavía no" cuenta como válida y baja la mediana', () => {
    const r = calcularArea(area('a1'), responder('a1', ['ninguno', 'junior', 'junior', 'junior']), cfg);
    expect(r.validas).toBe(4);
    expect(r.nivel).toBe('junior');
    expect(r.desparejo).toBe(true);
    expect(r.brechas).toEqual([{preguntaId: 'a1-1', valor: -1}]);
  });

  it('"No aplica" se excluye del cálculo', () => {
    const r = calcularArea(area('a1'), responder('a1', ['senior', 'senior', 'senior', 'noaplica']), cfg);
    expect(r.respondidas).toBe(4);
    expect(r.validas).toBe(3);
    expect(r.nivel).toBe('senior');
  });

  it('con menos de 2 respuestas válidas el área queda sin datos suficientes', () => {
    const r = calcularArea(area('a1'), responder('a1', ['senior', 'noaplica', 'noaplica', 'noaplica']), cfg);
    expect(r.estado).toBe('sin_datos');
    expect(r.nivel).toBeNull();
    expect(r.validas).toBe(1);
    expect(calcularArea(area('a1'), {}, cfg).estado).toBe('sin_datos');
  });

  it('se puede evaluar con respuestas parciales (por partes)', () => {
    const r = calcularArea(area('a1'), responder('a1', ['junior', 'semi_senior']), cfg);
    expect(r.estado).toBe('nivel');
    expect(r.respondidas).toBe(2);
    expect(r.nivel).toBe('junior');
  });

  it('un área despareja puede no tener brechas: Junior, Junior, Senior', () => {
    const r = calcularArea(area('a1'), responder('a1', ['junior', 'junior', 'senior']), cfg);
    expect(r.nivel).toBe('junior');
    expect(r.desparejo).toBe(true);
    expect(r.brechas).toEqual([]);
  });
});

describe('recomendaciones', () => {
  it('ordena por peso de mercado, después brecha, después prioridad LATAM', () => {
    // a1..a3 en Semi Senior y a4 en Junior; objetivo Senior.
    const r = {...parejo('a1', 'semi_senior'), ...parejo('a2', 'semi_senior'), ...parejo('a3', 'semi_senior'), ...parejo('a4', 'junior')};
    const d = diagnosticar(datos, r, 'senior');
    // pesos Senior: a1 3, a2 2, a3 2, a4 1. Brechas: 1, 1, 1, 2.
    expect(d.recomendaciones.map((x) => x.areaId)).toEqual(['a1', 'a2', 'a3', 'a4']);
  });

  it('el peso va antes que la brecha: una brecha grande de poco peso no tapa una chica de mucho peso', () => {
    const r = {...parejo('a1', 'semi_senior'), ...parejo('a4', 'inicial')};
    const d = diagnosticar(datos, r, 'senior');
    expect(d.recomendaciones.map((x) => [x.areaId, x.brecha])).toEqual([
      ['a1', 1],
      ['a4', 3],
    ]);
  });

  it('con el mismo peso gana la brecha mayor, y con la misma brecha, la prioridad LATAM', () => {
    const r = {...parejo('a2', 'semi_senior'), ...parejo('a3', 'junior')};
    expect(diagnosticar(datos, r, 'senior').recomendaciones.map((x) => x.areaId)).toEqual(['a3', 'a2']);
    const parejas = {...parejo('a2', 'junior'), ...parejo('a3', 'junior')};
    expect(diagnosticar(datos, parejas, 'senior').recomendaciones.map((x) => x.areaId)).toEqual(['a2', 'a3']);
  });

  it('sin objetivo elegido toma la mediana de las áreas más uno, con tope en Lead', () => {
    const d = diagnosticar(datos, todas('semi_senior'));
    expect(d.objetivo).toBe('senior');
    expect(d.objetivoElegido).toBe(false);
    expect(diagnosticar(datos, todas('lead')).objetivo).toBe('lead');
  });

  it('las áreas sin brecha pasan a mantenimiento y las no evaluadas a sinDatos', () => {
    const r = {...parejo('a1', 'lead'), ...parejo('a2', 'junior')};
    const d = diagnosticar(datos, r, 'lead');
    expect(d.mantenimiento.map((x) => x.areaId)).toEqual(['a1']);
    expect(d.recomendaciones.map((x) => x.areaId)).toEqual(['a2']);
    expect(d.sinDatos.map((x) => x.areaId)).toEqual(['a3', 'a4']);
  });

  it('todo "No aplica": sin datos, objetivo Inicial y ninguna recomendación', () => {
    const d = diagnosticar(datos, todas('noaplica'));
    expect(d.sinDatos).toHaveLength(datos.areas.length);
    expect(d.valorGeneral).toBeNull();
    expect(d.objetivo).toBe('inicial');
    expect(d.recomendaciones).toEqual([]);
    expect(d.mantenimiento).toEqual([]);
  });

  it('todo "Todavía no": todas sin empezar y todas con brecha hacia Inicial', () => {
    const d = diagnosticar(datos, todas('ninguno'));
    expect(d.areas.every((a) => a.estado === 'sin_empezar')).toBe(true);
    expect(d.valorGeneral).toBe(-1);
    expect(d.objetivo).toBe('inicial');
    expect(d.recomendaciones.map((x) => x.areaId)).toEqual(['a1', 'a2', 'a3', 'a4'].sort((x, y) => {
      const pa = (id: string) => area(id).prioridad_latam;
      return pa(x) - pa(y);
    }));
    expect(d.recomendaciones.every((x) => x.brecha === 1)).toBe(true);
  });

  it('con un objetivo por debajo de todas las áreas, todo pasa a mantenimiento', () => {
    const d = diagnosticar(datos, todas('senior'), 'inicial');
    expect(d.recomendaciones).toEqual([]);
    expect(d.mantenimiento).toHaveLength(datos.areas.length);
  });
});
