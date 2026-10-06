import {afterEach, describe, expect, it, vi} from 'vitest';
import type {Competencias} from './tipos';
import {sintetico} from './competencias.sintetico';
import {
  codificarRespuestas,
  construirQuery,
  decodificarRespuestas,
  leerQuery,
  versionCuestionario,
} from './compartir';
import {borrarEstado, CLAVE_ESTADO, guardarEstado, leerEstado} from './estado';
import type {Respuestas} from './diagnostico';

const total = sintetico.areas.reduce((n, a) => n + a.diagnostico.length, 0);
const ejemplo: Respuestas = {'a1-1': 1, 'a1-2': 5, 'a1-3': 6, 'a1-4': 4, 'a4-2': 3};

describe('URL compartible', () => {
  it('codifica una letra por pregunta y decodifica sin perder respuestas', () => {
    const codigo = codificarRespuestas(sintetico, ejemplo);
    expect(codigo).toHaveLength(total);
    expect(codigo).toMatch(/^[0-9-]+$/);
    expect(decodificarRespuestas(sintetico, codigo)).toEqual(ejemplo);
  });

  it('rechaza códigos de otro largo, con caracteres inválidos o fuera de rango', () => {
    expect(decodificarRespuestas(sintetico, 'abc')).toBeNull();
    expect(decodificarRespuestas(sintetico, null)).toBeNull();
    expect(decodificarRespuestas(sintetico, 'x'.repeat(total))).toBeNull();
    expect(decodificarRespuestas(sintetico, '9'.repeat(total))).toBeNull();
  });

  it('ida y vuelta por la query, con el nivel objetivo', () => {
    const q = construirQuery(sintetico, ejemplo, 'senior');
    expect(new URLSearchParams(q).get('v')).toBe(versionCuestionario(sintetico));
    expect(leerQuery(sintetico, `?${q}`)).toEqual({ok: true, respuestas: ejemplo, objetivo: 'senior'});
  });

  it('descarta un objetivo inválido y avisa si falta r', () => {
    const v = versionCuestionario(sintetico);
    expect(leerQuery(sintetico, `?v=${v}&r=${'-'.repeat(total)}&o=jefe`)).toEqual({ok: true, respuestas: {}, objetivo: null});
    expect(leerQuery(sintetico, `?v=${v}`)).toEqual({ok: false, motivo: 'invalido'});
  });

  it('un link con otra versión, o sin versión, se descarta como versión anterior', () => {
    const r = '-'.repeat(total);
    expect(leerQuery(sintetico, `?v=00000000&r=${r}`)).toEqual({ok: false, motivo: 'version'});
    expect(leerQuery(sintetico, `?r=${r}`)).toEqual({ok: false, motivo: 'version'});
  });
});

describe('versión del cuestionario', () => {
  it('es estable y de 8 caracteres hexadecimales', () => {
    expect(versionCuestionario(sintetico)).toBe(versionCuestionario(sintetico));
    expect(versionCuestionario(sintetico)).toMatch(/^[0-9a-f]{8}$/);
  });

  it('cambia si cambia el nivel de una opción o el id de una pregunta', () => {
    const base = versionCuestionario(sintetico);
    const otraOpcion: Competencias = structuredClone(sintetico);
    otraOpcion.areas[0].diagnostico[0].opciones[0].nivel = 'junior';
    expect(versionCuestionario(otraOpcion)).not.toBe(base);
    const otroId: Competencias = structuredClone(sintetico);
    otroId.areas[0].diagnostico[0].id = 'a1-x';
    expect(versionCuestionario(otroId)).not.toBe(base);
  });

  it('no cambia si cambia solo el texto', () => {
    const copia: Competencias = structuredClone(sintetico);
    copia.areas[0].diagnostico[0].enunciado = 'Otro texto';
    copia.areas[0].diagnostico[0].opciones[0].texto = 'Otra redacción';
    expect(versionCuestionario(copia)).toBe(versionCuestionario(sintetico));
  });
});

describe('estado en localStorage', () => {
  function memoria(inicial: Record<string, string> = {}) {
    const datos = new Map(Object.entries(inicial));
    const almacenamiento = {
      getItem: (k: string) => datos.get(k) ?? null,
      setItem: (k: string, v: string) => void datos.set(k, v),
      removeItem: (k: string) => void datos.delete(k),
    };
    vi.stubGlobal('window', {localStorage: almacenamiento});
    return datos;
  }
  afterEach(() => vi.unstubAllGlobals());

  it('guarda con versión y lo lee de vuelta', () => {
    const datos = memoria();
    guardarEstado(sintetico, {respuestas: ejemplo, objetivo: 'lead'});
    expect(JSON.parse(datos.get(CLAVE_ESTADO) as string).v).toBe(versionCuestionario(sintetico));
    expect(leerEstado(sintetico)).toEqual({estado: {respuestas: ejemplo, objetivo: 'lead'}, versionAnterior: false});
  });

  it('descarta y borra el estado de otra versión', () => {
    const datos = memoria({[CLAVE_ESTADO]: JSON.stringify({v: 'viejo', r: '-'.repeat(total), o: null})});
    expect(leerEstado(sintetico)).toEqual({estado: null, versionAnterior: true});
    expect(datos.has(CLAVE_ESTADO)).toBe(false);
  });

  it('descarta el estado guardado sin versión (formato anterior)', () => {
    memoria({[CLAVE_ESTADO]: JSON.stringify({r: '-'.repeat(total), o: null})});
    expect(leerEstado(sintetico).versionAnterior).toBe(true);
  });

  it('no se rompe con JSON corrupto ni con almacenamiento bloqueado', () => {
    memoria({[CLAVE_ESTADO]: '{no es json'});
    expect(leerEstado(sintetico)).toEqual({estado: null, versionAnterior: false});
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => {
          throw new Error('bloqueado');
        },
        setItem: () => {
          throw new Error('bloqueado');
        },
        removeItem: () => {
          throw new Error('bloqueado');
        },
      },
    });
    expect(leerEstado(sintetico)).toEqual({estado: null, versionAnterior: false});
    expect(() => guardarEstado(sintetico, {respuestas: ejemplo, objetivo: null})).not.toThrow();
    expect(() => borrarEstado()).not.toThrow();
  });
});
