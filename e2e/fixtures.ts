import {expect, test as base, type Page} from '@playwright/test';

/** Páginas y acciones comunes del autodiagnóstico, para que los tests cuenten la historia y no el DOM. */
export class Autodiagnostico {
  constructor(readonly page: Page) {}

  async abrir() {
    await this.page.goto('/autodiagnostico');
    await expect(this.page.getByRole('heading', {level: 1, name: /Contá qué hacés/})).toBeVisible();
  }

  async elegirArea(nombre: string) {
    await this.page.getByRole('navigation', {name: 'Áreas'}).getByRole('button', {name: new RegExp(nombre)}).click();
    await expect(this.page.getByRole('heading', {level: 2, name: nombre})).toBeVisible();
  }

  /** Elige la opción cuyo texto empieza con `inicio` dentro de la pregunta `enunciado`. */
  async responder(enunciado: RegExp, inicio: RegExp) {
    const pregunta = this.page.getByRole('group', {name: enunciado});
    await pregunta.getByRole('radio', {name: inicio}).check();
  }

  /** Completa UI con Semi Senior, Junior, Semi Senior y Senior (ejemplo de competencias.md 7.3). */
  async completarUi() {
    await this.elegirArea('Automatización de UI');
    await this.responder(/automatizar un caso nuevo de UI/, /^Primero decido si conviene por UI o por API/);
    await this.responder(/falla en el pipeline y en tu máquina pasa/, /^Lo reproduzco en las mismas condiciones/);
    await this.responder(/cómo está organizada la suite/, /^Mantengo la suite de mi feature/);
    await this.responder(/tests de UI de otras personas/, /^Reviso con foco en la fragilidad/);
  }
}

export const test = base.extend<{autodiagnostico: Autodiagnostico}>({
  autodiagnostico: async ({page}, use) => {
    await use(new Autodiagnostico(page));
  },
});

export {expect};
