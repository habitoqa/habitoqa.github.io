import {expect, test} from './fixtures';
import {area, AREAS, nombreNivel, opcion} from './datos';
import competencias from '../src/data/competencias.json';
import {versionCuestionario} from '../src/lib/compartir';
import type {Competencias} from '../src/lib/tipos';

const frase = (nivel: Parameters<typeof nombreNivel>[0]) =>
  `Tus respuestas se parecen a lo que hace alguien ${nombreNivel(nivel)} en esta área.`;
const UI = area('ui');
const resultadoUi = (page: import('@playwright/test').Page) =>
  page.getByRole('article', {name: `Resultado: ${UI.nombre}`});

test.describe('autodiagnóstico', () => {
  test('completar un área y ver el resultado', async ({page, autodiagnostico}) => {
    await autodiagnostico.abrir();
    await expect(autodiagnostico.progreso).toContainText(autodiagnostico.textoProgreso(0));

    await autodiagnostico.completarUi();

    await expect(autodiagnostico.progreso).toContainText(autodiagnostico.textoProgreso(UI.diagnostico.length));
    const resultado = resultadoUi(page);
    await expect(resultado.getByRole('heading', {name: frase('semi_senior')})).toBeVisible();
    await expect(resultado).toContainText('hacés cosas de niveles distintos');
    await expect(resultado.getByRole('link', {name: new RegExp(`Ver la celda de ${nombreNivel('senior')} en el mapa`)})).toHaveAttribute(
      'href',
      '/mapa#ui-senior',
    );
    await expect(resultado.getByText('¿Podrías mostrar esto?')).toBeVisible();
    // Nunca "sos <nivel>"
    await expect(page.getByText(/\bSos\b/)).toHaveCount(0);
  });

  test('las opciones no revelan el nivel y siempre hay salida', async ({page, autodiagnostico}) => {
    await autodiagnostico.abrir();
    const esperadas = UI.diagnostico[0].opciones;
    const pregunta = autodiagnostico.pregunta('ui', 0);
    await expect(pregunta.getByRole('radio')).toHaveCount(esperadas.length);
    await expect(pregunta.getByRole('radio', {name: 'Todavía no hice algo así.'})).toBeVisible();
    await expect(pregunta.getByRole('radio', {name: 'No aplica a mi trabajo actual.'})).toBeVisible();
    for (const nivel of ['inicial', 'junior', 'semi_senior', 'senior', 'lead'] as const) {
      await expect(pregunta.getByText(new RegExp(`\\b${nombreNivel(nivel)}\\b`))).toHaveCount(0);
    }
    // Las dos opciones fijas van siempre al final
    await expect(pregunta.getByRole('radio').nth(esperadas.length - 2)).toHaveAccessibleName('Todavía no hice algo así.');
    await expect(pregunta.getByRole('radio').nth(esperadas.length - 1)).toHaveAccessibleName('No aplica a mi trabajo actual.');
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('al recargar se conserva el estado', async ({page, autodiagnostico}) => {
    await autodiagnostico.abrir();
    await autodiagnostico.completarUi();
    await expect(resultadoUi(page).getByRole('heading', {name: frase('semi_senior')})).toBeVisible();

    await page.reload();
    await expect(page.locator('.cuestionario[data-listo="true"]')).toBeAttached();

    await expect(autodiagnostico.progreso).toContainText(autodiagnostico.textoProgreso(UI.diagnostico.length));
    await expect(resultadoUi(page).getByRole('heading', {name: frase('semi_senior')})).toBeVisible();
    await autodiagnostico.elegirArea('ui');
    await expect(autodiagnostico.opcionElegida('ui', 1, 'junior')).toBeChecked();
    // El botón del área dice su nivel y su avance
    await expect(
      page.getByRole('navigation', {name: 'Áreas'}).getByRole('button', {name: `${UI.nombre} ${nombreNivel('semi_senior')}, ${UI.diagnostico.length} de ${UI.diagnostico.length}`}),
    ).toBeVisible();
  });

  test('el link compartido se abre en un contexto limpio en solo lectura', async ({page, browser, autodiagnostico}) => {
    await autodiagnostico.abrir();
    await autodiagnostico.completarUi();
    const link = await page.getByLabel('Link para compartir tu resultado').inputValue();
    expect(link).toContain('/autodiagnostico/resultado?');
    const query = new URL(link).searchParams;
    expect(query.get('v')).toMatch(/^[0-9a-f]{8}$/);
    expect(query.get('r')).toHaveLength(AREAS.reduce((n, a) => n + a.diagnostico.length, 0));

    const limpio = await browser.newContext();
    try {
      const otra = await limpio.newPage();
      await otra.goto(link);
      await expect(otra.locator('main[data-listo="true"]')).toBeAttached();

      await expect(otra.getByRole('heading', {name: frase('semi_senior')})).toBeVisible();
      await expect(otra.getByRole('heading', {level: 1, name: /solo lectura/})).toBeVisible();
      // Solo lectura: sin formulario ni acciones que modifiquen
      await expect(otra.getByRole('radio')).toHaveCount(0);
      await expect(otra.getByRole('button', {name: /Borrar/})).toHaveCount(0);
      await expect(otra.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
      // Abrir el link no guarda nada en el navegador de quien lo recibe
      const guardado = await otra.evaluate(() => window.localStorage.length);
      expect(guardado).toBe(0);
    } finally {
      await limpio.close();
    }
  });

  test('un link de otra versión del cuestionario avisa y no muestra un resultado', async ({page}) => {
    const r = '0'.repeat(AREAS.reduce((n, a) => n + a.diagnostico.length, 0));
    await page.goto(`/autodiagnostico/resultado?v=00000000&r=${r}`);
    await expect(page.getByRole('alert')).toContainText('versión anterior');
    await expect(page.getByRole('heading', {name: /Tus respuestas se parecen/})).toHaveCount(0);
  });

  test('un link inválido avisa en lugar de romperse', async ({page}) => {
    const v = versionCuestionario(competencias as unknown as Competencias);
    await page.goto(`/autodiagnostico/resultado?v=${v}&r=xyz`);
    await expect(page.getByRole('alert')).toContainText('no tiene un resultado válido');
  });

  test('el estado guardado de otra versión se descarta con un aviso', async ({page, autodiagnostico}) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('hq-autodiagnostico-v1', JSON.stringify({v: '00000000', r: '0'.repeat(46), o: null}));
    });
    await autodiagnostico.abrir();
    await expect(page.getByRole('alert')).toContainText('versión anterior del cuestionario');
    await expect(autodiagnostico.progreso).toContainText(autodiagnostico.textoProgreso(0));
    const siguiente = opcion('ui', 0, 'junior');
    await expect(autodiagnostico.pregunta('ui', 0).getByRole('radio', {name: siguiente.texto, exact: true})).not.toBeChecked();
  });
});
