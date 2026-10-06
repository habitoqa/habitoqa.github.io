/**
 * Integridad del competencias.json REAL frente al algoritmo. Los casos de lógica están en
 * diagnostico.test.ts con datos sintéticos; acá solo se comprueba que el contenido real sea coherente.
 */
import {describe, expect, it} from 'vitest';
import datos from '../data/competencias.json';
import type {Area, Competencias, NivelId} from './tipos';
import {calcularArea, diagnosticar, medianaAbajo, VALOR_NIVEL, type Respuestas} from './diagnostico';
import {codificarRespuestas, decodificarRespuestas, versionCuestionario} from './compartir';
import {recortar} from '../../scripts/recortar-competencias.mjs';

const competencias = datos as unknown as Competencias;
const cfg = competencias.diagnostico;
const NIVELES: NivelId[] = ['inicial', 'junior', 'semi_senior', 'senior', 'lead'];

/**
 * Respuestas de un área cuyo nivel resultante es `nivel`. No todas las preguntas tienen una opción de cada
 * nivel, así que se busca por fuerza bruta una combinación de opciones cuya mediana dé ese valor.
 */
function areaEn(area: Area, nivel: NivelId): Respuestas {
  const opciones = area.diagnostico.map((p) =>
    p.opciones
      .map((o, i) => ({i, v: o.nivel && o.nivel !== 'ninguno' ? VALOR_NIVEL[o.nivel] : null}))
      .filter((x) => x.v !== null),
  );
  const probar = (k: number, acc: number[]): number[] | null => {
    if (k === area.diagnostico.length) {
      const valores = acc.map((i, q) => opciones[q].find((x) => x.i === i)!.v as number);
      return medianaAbajo(valores) === VALOR_NIVEL[nivel] ? acc : null;
    }
    for (const o of opciones[k]) {
      const r = probar(k + 1, [...acc, o.i]);
      if (r) return r;
    }
    return null;
  };
  const combo = probar(0, []);
  if (!combo) throw new Error(`${area.id} no puede dar ${nivel}`);
  return Object.fromEntries(area.diagnostico.map((p, q) => [p.id, combo[q]]));
}

const todasEn = (nivel: NivelId) =>
  competencias.areas.reduce<Respuestas>((acc, a) => ({...acc, ...areaEn(a, nivel)}), {});

describe('integridad del JSON real', () => {
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
      for (const nivel of NIVELES) {
        expect(calcularArea(a, areaEn(a, nivel), cfg).nivel, `${a.id} ${nivel}`).toBe(nivel);
      }
    }
  });

  it('el ejemplo de competencias.md 7.4: Semi Senior salvo performance y seguridad (Junior), objetivo Senior', () => {
    const area = (id: string) => competencias.areas.find((a) => a.id === id) as Area;
    const r = {...todasEn('semi_senior'), ...areaEn(area('performance'), 'junior'), ...areaEn(area('seg_acc'), 'junior')};
    const d = diagnosticar(competencias, r, 'senior');
    expect(d.recomendaciones.map((x) => x.areaId)).toEqual([
      'ui', 'cicd', 'api', 'ingles', // requeridos en Senior, brecha 1
      'performance', 'seg_acc', // diferenciales, brecha 2
      'diseno', 'datos', 'estrategia', 'ia', 'exploratorio', // diferenciales, brecha 1
      'calt', // sin tema de mercado
    ]);
  });

  it('el link compartible tiene una letra por pregunta y la versión es estable', () => {
    const r = todasEn('senior');
    const codigo = codificarRespuestas(competencias, r);
    expect(codigo).toHaveLength(46);
    expect(decodificarRespuestas(competencias, codigo)).toEqual(r);
    expect(versionCuestionario(competencias)).toMatch(/^[0-9a-f]{8}$/);
  });

  it('la versión recortada del cliente conserva todo lo que usa el sitio y da la misma versión de cuestionario', () => {
    const cliente = recortar(datos) as unknown as Competencias;
    expect(versionCuestionario(cliente)).toBe(versionCuestionario(competencias));
    expect(cliente.areas).toHaveLength(competencias.areas.length);
    expect(JSON.stringify(cliente).length).toBeLessThan(JSON.stringify(datos).length * 0.85);
    const d1 = diagnosticar(competencias, todasEn('junior'));
    const d2 = diagnosticar(cliente, todasEn('junior'));
    expect(d2.recomendaciones.map((x) => x.areaId)).toEqual(d1.recomendaciones.map((x) => x.areaId));
  });
});
