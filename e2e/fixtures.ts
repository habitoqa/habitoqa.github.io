import {expect, test as base, type Locator, type Page} from '@playwright/test';
import {area, opcion, TOTAL_PREGUNTAS, type NivelId} from './datos';

/** Acciones comunes del autodiagnóstico, para que los tests cuenten la historia y no el DOM. */
export class Autodiagnostico {
  constructor(readonly page: Page) {}

  /** Abre la página y espera a que el componente haya hidratado y cargado el estado guardado. */
  async abrir() {
    await this.page.goto('/autodiagnostico');
    await expect(this.page.locator('.cuestionario[data-listo="true"]')).toBeAttached();
    await expect(this.page.getByRole('heading', {level: 1})).toBeVisible();
  }

  get progreso(): Locator {
    return this.page.getByRole('status').first();
  }

  textoProgreso(respondidas: number) {
    return `Respondiste ${respondidas} de ${TOTAL_PREGUNTAS} preguntas`;
  }

  async elegirArea(areaId: string) {
    const nombre = area(areaId).nombre;
    await this.page.getByRole('navigation', {name: 'Áreas'}).getByRole('button', {name: nombre}).click();
    await expect(this.page.getByRole('heading', {level: 2, name: nombre})).toBeVisible();
  }

  pregunta(areaId: string, indice: number): Locator {
    return this.page.getByRole('group', {name: area(areaId).diagnostico[indice].enunciado});
  }

  opcionElegida(areaId: string, indice: number, nivel: NivelId): Locator {
    return this.pregunta(areaId, indice).getByRole('radio', {name: opcion(areaId, indice, nivel).texto, exact: true});
  }

  /** Responde cada pregunta del área con el nivel indicado (uno por pregunta, en orden). */
  async responder(areaId: string, niveles: NivelId[]) {
    await this.elegirArea(areaId);
    for (const [i, nivel] of niveles.entries()) await this.opcionElegida(areaId, i, nivel).check();
  }

  /** Semi Senior, Junior, Semi Senior y Senior (ejemplo de competencias.md 7.3): da Semi Senior, perfil desparejo. */
  async completarUi() {
    await this.responder('ui', ['semi_senior', 'junior', 'semi_senior', 'senior']);
  }
}

export const test = base.extend<{autodiagnostico: Autodiagnostico}>({
  autodiagnostico: async ({page}, use) => {
    await use(new Autodiagnostico(page));
  },
});

export {expect};
