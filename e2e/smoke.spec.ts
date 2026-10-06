import {expect, test} from './fixtures';

test.describe('smoke', () => {
  test('la home muestra la propuesta, un solo CTA y el registro de ejemplo', async ({page}) => {
    await page.goto('/');
    await expect(page.getByRole('heading', {level: 1})).toHaveText('La calidad no es un acto, es un hábito.');
    await expect(page.getByText('Adaptada de Will Durant (sobre Aristóteles)')).toBeVisible();
    await expect(page.getByRole('link', {name: 'Empezar el autodiagnóstico'})).toHaveAttribute('href', '/autodiagnostico');
    await expect(page.getByRole('main').getByRole('link', {name: 'Ver el mapa de competencias'})).toBeVisible();
    const registro = page.getByRole('complementary', {name: 'Ejemplo de registro por área'});
    await expect(registro).toContainText('Esto es un ejemplo.');
  });

  test('la home muestra tu registro cuando hay un resultado guardado', async ({page, autodiagnostico}) => {
    await autodiagnostico.abrir();
    await autodiagnostico.completarUi();
    await page.goto('/');
    const registro = page.getByRole('complementary', {name: 'Tu registro por área'});
    await expect(registro).toContainText('Automatización de UI');
    await expect(registro).toContainText('Semi Senior');
    await expect(registro).not.toContainText('Esto es un ejemplo.');
  });

  test('/mapa abre una celda por su ancla', async ({page}) => {
    await page.goto('/mapa#ui-semi-senior');
    const celda = page.getByRole('article', {name: 'Semi Senior'}).and(page.locator('#ui-semi-senior'));
    await expect(celda).toBeVisible();
    await expect(celda.getByRole('list', {name: 'Comportamientos observables'}).getByRole('listitem')).toHaveCount(3);
    await expect(celda.getByText('Señal de evidencia', {exact: true}).first()).toBeVisible();
    await expect(celda.getByText('Variante mobile')).toBeVisible();
    await expect(page.locator('#seg-acc-lead')).toBeAttached();
  });

  test('la matriz enlaza a cada celda', async ({page}) => {
    await page.goto('/mapa');
    await page.getByRole('link', {name: /^Testing de API e integración, Senior/}).click();
    await expect(page).toHaveURL(/\/mapa#api-senior$/);
    await expect(page.locator('#api-senior')).toBeInViewport();
  });

  test('el navbar tiene solo las cuatro entradas del MVP y el footer no tiene links personales', async ({page}) => {
    await page.goto('/');
    const navbar = page.getByRole('navigation', {name: 'Principal'});
    // 5 links: el logo (con su texto alternativo) y las cuatro entradas del MVP
    await expect(navbar.getByRole('link')).toHaveCount(5);
    await expect(navbar.getByRole('link', {name: 'Hábito QA'})).toBeVisible();
    await expect(navbar.locator('a.navbar__item')).toHaveText(['Inicio', 'Autodiagnóstico', 'Mapa', 'Guías']);

    await navbar.getByRole('link', {name: 'Mapa'}).click();
    await expect(page).toHaveURL(/\/mapa$/);
    await navbar.getByRole('link', {name: 'Guías'}).click();
    await expect(page.getByRole('heading', {level: 1, name: 'Guías'})).toBeVisible();

    const footer = page.getByRole('contentinfo');
    await expect(footer.getByRole('link', {name: 'Sobre el autor'})).toHaveAttribute('href', '/autor');
    await expect(footer.getByRole('link', {name: 'Instagram'})).toHaveAttribute('href', 'https://instagram.com/habitoqa');
    await expect(footer.getByRole('link', {name: 'GitHub'})).toHaveAttribute('href', 'https://github.com/habitoqa');
    await expect(footer.getByRole('link')).toHaveCount(3);
  });

  test('/autor y las guías del MVP existen', async ({page}) => {
    await page.goto('/autor');
    await expect(page.getByRole('heading', {level: 1, name: 'Sobre el autor'})).toBeVisible();
    await expect(page.getByText('Contenido en preparación.')).toBeVisible();
    for (const ruta of [
      '/guias/ui/diagnosticar-un-test-inestable',
      '/guias/cicd/github-actions-como-gate',
      '/guias/ingles/como-redactar-un-defecto',
    ]) {
      await page.goto(ruta);
      await expect(page.getByRole('heading', {level: 1})).toBeVisible();
    }
  });

  test('el modo oscuro cambia el tema y se conserva al recargar', async ({page}) => {
    await page.goto('/');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');
    const alternar = page.getByRole('button', {name: /Cambiar entre modo oscuro y claro/});
    // El botón recorre sistema -> claro -> oscuro (respeta la preferencia del sistema al entrar).
    await expect(html).toHaveAttribute('data-theme-choice', 'system');
    await alternar.click();
    await expect(html).toHaveAttribute('data-theme-choice', 'light');
    await alternar.click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByRole('navigation', {name: 'Principal'})).toHaveCSS('background-color', 'rgb(23, 18, 31)');
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test('sin elección previa, respeta el modo oscuro del sistema', async ({browser}) => {
    const contexto = await browser.newContext({colorScheme: 'dark'});
    try {
      const page = await contexto.newPage();
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    } finally {
      await contexto.close();
    }
  });
});
