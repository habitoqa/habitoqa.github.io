import {expect, test} from './fixtures';

const FRASE_SEMI_SENIOR = 'Tus respuestas se parecen a lo que hace alguien Semi Senior en esta área.';

test.describe('autodiagnóstico', () => {
  test('completar un área y ver el resultado', async ({page, autodiagnostico}) => {
    await autodiagnostico.abrir();
    await expect(page.getByRole('status').first()).toContainText('Respondiste 0 de 46 preguntas');

    await autodiagnostico.completarUi();

    await expect(page.getByRole('status').first()).toContainText('Respondiste 4 de 46 preguntas');
    const resultado = page.getByRole('article', {name: 'Resultado: Automatización de UI'});
    await expect(resultado.getByRole('heading', {name: FRASE_SEMI_SENIOR})).toBeVisible();
    await expect(resultado).toContainText('hacés cosas de niveles distintos');
    await expect(resultado.getByRole('link', {name: /Ver la celda de Senior en el mapa/})).toHaveAttribute(
      'href',
      '/mapa#ui-senior',
    );
    await expect(resultado.getByText('¿Podrías mostrar esto?')).toBeVisible();
    // Nunca "sos <nivel>"
    await expect(page.getByText(/\bSos\b/)).toHaveCount(0);
  });

  test('las opciones no revelan el nivel y siempre hay salida', async ({page, autodiagnostico}) => {
    await autodiagnostico.abrir();
    const pregunta = page.getByRole('group', {name: /automatizar un caso nuevo de UI/});
    await expect(pregunta.getByRole('radio')).toHaveCount(7);
    await expect(pregunta.getByRole('radio', {name: 'Todavía no hice algo así.'})).toBeVisible();
    await expect(pregunta.getByRole('radio', {name: 'No aplica a mi trabajo actual.'})).toBeVisible();
    await expect(pregunta.getByText(/Semi Senior|Junior|Lead/)).toHaveCount(0);
  });

  test('al recargar se conserva el estado', async ({page, autodiagnostico}) => {
    await autodiagnostico.abrir();
    await autodiagnostico.completarUi();
    await expect(page.getByRole('heading', {name: FRASE_SEMI_SENIOR})).toBeVisible();

    await page.reload();

    await expect(page.getByRole('status').first()).toContainText('Respondiste 4 de 46 preguntas');
    await expect(page.getByRole('heading', {name: FRASE_SEMI_SENIOR})).toBeVisible();
    await autodiagnostico.elegirArea('Automatización de UI');
    await expect(
      page.getByRole('group', {name: /falla en el pipeline y en tu máquina pasa/}).getByRole('radio', {
        name: /^Lo reproduzco en las mismas condiciones/,
      }),
    ).toBeChecked();
  });

  test('el link compartido se abre en un contexto limpio en solo lectura', async ({page, browser, autodiagnostico}) => {
    await autodiagnostico.abrir();
    await autodiagnostico.completarUi();
    const link = await page.getByLabel('Link para compartir tu resultado').inputValue();
    expect(link).toContain('/autodiagnostico/resultado?r=');

    const limpio = await browser.newContext();
    try {
      const otra = await limpio.newPage();
      await otra.goto(link);

      await expect(otra.getByRole('heading', {name: FRASE_SEMI_SENIOR})).toBeVisible();
      await expect(otra.getByText('Resultado compartido', {exact: true}).first()).toBeVisible();
      // Solo lectura: sin formulario ni opciones para modificar
      await expect(otra.getByRole('radio')).toHaveCount(0);
      await expect(otra.getByRole('button', {name: /Borrar/})).toHaveCount(0);
      await expect(otra.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
      // Abrir el link no guarda nada en el navegador de quien lo recibe
      const guardado = await otra.evaluate(() => window.localStorage.getItem('hq-autodiagnostico-v1'));
      expect(guardado).toBeNull();
    } finally {
      await limpio.close();
    }
  });

  test('un link inválido avisa en lugar de romperse', async ({page}) => {
    await page.goto('/autodiagnostico/resultado?r=xyz');
    await expect(page.getByRole('alert')).toContainText('no tiene un resultado válido');
  });
});
