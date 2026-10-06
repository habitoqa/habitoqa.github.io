import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {validarCompetencias} from './validar-competencias.mjs';
import {validarFrontmatter} from './validar-guias.mjs';

const real = () => JSON.parse(readFileSync('src/data/competencias.json', 'utf8'));

describe('validar-competencias', () => {
  it('el JSON real es válido', () => expect(validarCompetencias(real())).toEqual([]));

  it('detecta un id de comportamiento repetido o fuera de secuencia', () => {
    const d = real();
    d.areas[0].celdas[0].comportamientos[1].id = d.areas[0].celdas[0].comportamientos[0].id;
    const e = validarCompetencias(d);
    expect(e.some((x: string) => x.includes('repetido'))).toBe(true);
    expect(e.some((x: string) => x.includes('se esperaba el id'))).toBe(true);
  });

  it('detecta un recurso inexistente, celdas faltantes y preguntas sin las opciones fijas', () => {
    const d = real();
    d.areas[0].celdas[2].recursos.push({recurso: 'no-existe', ubicacion: null});
    d.areas[1].celdas.pop();
    d.areas[2].diagnostico[0].opciones.pop();
    const e = validarCompetencias(d).join('\n');
    expect(e).toContain('el recurso no-existe no existe');
    expect(e).toContain('tienen que ser 5');
    expect(e).toContain('"No aplica"');
  });
});

describe('validar-guias', () => {
  const comp = real();
  const valido = () => ({
    title: 'Una guía',
    description: 'Qué cubre',
    area: 'cicd',
    nivel: 'semi_senior',
    celda: 'cicd.semi_senior',
    comportamientos: ['cicd.semi_senior.1', 'ui.semi_senior.3'],
    respaldo: {mercado: [{avisos: ['A04'], seccion: '§7.2'}], libros: [{recurso: 'cd', ubicacion: 'cap. 5'}]},
    alternativa_externa: [{nombre: 'Playwright', url: 'https://playwright.dev/docs/ci-intro', aporta: 'algo'}],
    fuentes: ['https://playwright.dev/docs/ci-intro'],
    herramientas: [{nombre: 'playwright', version: '1.63'}],
    ultima_revision: new Date('2026-10-05'),
  });
  const hoy = new Date('2026-10-06');

  it('acepta un frontmatter completo (con un comportamiento de otra celda)', () => {
    expect(validarFrontmatter(valido(), comp, hoy)).toEqual([]);
  });

  it('rechaza ids, área y celda que no existen o no coinciden', () => {
    const e = validarFrontmatter(
      {...valido(), area: 'nada', celda: 'cicd.senior', comportamientos: ['cicd.semi_senior.99']},
      comp,
      hoy,
    ).join('\n');
    expect(e).toContain('area: nada no existe');
    expect(e).toContain('no coincide con area.nivel');
    expect(e).toContain('cicd.semi_senior.99 no existe');
  });

  it('exige que algún comportamiento sea de la celda declarada', () => {
    const e = validarFrontmatter({...valido(), comportamientos: ['ui.semi_senior.3']}, comp, hoy).join('\n');
    expect(e).toContain('ninguno pertenece a la celda declarada');
  });

  it('exige respaldo y rechaza recursos desconocidos y avisos mal formados', () => {
    expect(validarFrontmatter({...valido(), respaldo: {mercado: [], libros: []}}, comp, hoy).join()).toContain('hace falta respaldo');
    expect(validarFrontmatter({...valido(), respaldo: {libros: [{recurso: 'x', ubicacion: 'y'}]}}, comp, hoy).join()).toContain('el recurso x no existe');
    expect(validarFrontmatter({...valido(), respaldo: {mercado: [{avisos: ['04'], seccion: '§1'}]}}, comp, hoy).join()).toContain('avisos');
  });

  it('rechaza una fecha de revisión futura o ausente', () => {
    expect(validarFrontmatter({...valido(), ultima_revision: new Date('2027-01-01')}, comp, hoy).join()).toContain('fecha futura');
    expect(validarFrontmatter({...valido(), ultima_revision: undefined}, comp, hoy).join()).toContain('ultima_revision');
  });

  it('rechaza campos obligatorios faltantes', () => {
    const {fuentes, herramientas, ...incompleto} = valido();
    const e = validarFrontmatter(incompleto, comp, hoy).join('\n');
    expect(e).toContain('fuentes');
    expect(e).toContain('herramientas');
  });
});
