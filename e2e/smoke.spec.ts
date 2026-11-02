import {expect, test} from './fixtures';
import {ancla, area, AREAS, celda, frontmatterGuia, GUIAS, nombreNivel, textoComportamiento} from './datos';

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
    await expect(page.locator('.registro[data-listo="true"]')).toBeAttached();
    const registro = page.getByRole('complementary', {name: 'Tu registro por área'});
    await expect(registro).toContainText(area('ui').nombre);
    await expect(registro).toContainText(nombreNivel('semi_senior'));
    await expect(registro).not.toContainText('Esto es un ejemplo.');
  });

  test('/mapa abre una celda por su ancla', async ({page}) => {
    const datos = celda('ui', 'semi_senior');
    await page.goto(`/mapa#${ancla('ui', 'semi_senior')}`);
    const ficha = page.getByRole('article', {name: nombreNivel('semi_senior')}).and(page.locator(`#${ancla('ui', 'semi_senior')}`));
    await expect(ficha).toBeVisible();
    await expect(ficha.getByRole('list', {name: 'Comportamientos observables'}).getByRole('listitem')).toHaveCount(datos.comportamientos.length);
    await expect(ficha.getByText('Señal de evidencia', {exact: true}).first()).toBeVisible();
    await expect(ficha.getByText('Variante mobile')).toBeVisible();
  });

  test('el mapa tiene una celda con ancla por cada área y nivel', async ({page}) => {
    await page.goto('/mapa');
    for (const a of AREAS) {
      for (const c of a.celdas) {
        await expect(page.locator(`#${ancla(a.id, c.nivel as never)}`)).toBeAttached();
      }
    }
  });

  test('la matriz enlaza a cada celda', async ({page}) => {
    const api = area('api');
    await page.goto('/mapa');
    await page.getByRole('link', {name: new RegExp(`^${api.nombre}, ${nombreNivel('senior')}`)}).click();
    await expect(page).toHaveURL(new RegExp(`/mapa#${ancla('api', 'senior')}$`));
    await expect(page.locator(`#${ancla('api', 'senior')}`)).toBeInViewport();
  });

  test('el navbar tiene las cuatro entradas del MVP y el footer no tiene links personales ni al autor', async ({page}) => {
    await page.goto('/');
    const navbar = page.getByRole('navigation', {name: 'Principal'});
    // el logo (con su texto alternativo) y las cuatro entradas del MVP
    await expect(navbar.getByRole('link')).toHaveCount(5);
    await expect(navbar.getByRole('link', {name: 'Hábito QA'})).toBeVisible();
    for (const nombre of ['Inicio', 'Autodiagnóstico', 'Mapa', 'Guías']) {
      await expect(navbar.getByRole('link', {name: nombre, exact: true})).toBeVisible();
    }

    await navbar.getByRole('link', {name: 'Mapa', exact: true}).click();
    await expect(page).toHaveURL(/\/mapa$/);
    await navbar.getByRole('link', {name: 'Guías', exact: true}).click();
    await expect(page.getByRole('heading', {level: 1, name: 'Guías'})).toBeVisible();

    const footer = page.getByRole('contentinfo');
    await expect(footer.getByRole('link', {name: 'Instagram'})).toHaveAttribute('href', 'https://instagram.com/habitoqa');
    await expect(footer.getByRole('link', {name: 'GitHub'})).toHaveAttribute('href', 'https://github.com/habitoqa');
    await expect(footer.getByRole('link')).toHaveCount(2);
  });

  test('/autor no está publicada hasta que el autor confirme el contenido', async ({page}) => {
    const respuesta = await page.goto('/autor');
    expect(respuesta?.status()).toBe(404);
    await expect(page.getByRole('heading', {level: 1})).toContainText(/no encontr/i);
  });

  for (const guia of GUIAS) {
    test(`la ficha de ${guia.url} muestra los comportamientos de su frontmatter`, async ({page}) => {
      const fm = frontmatterGuia(guia.ruta);
      await page.goto(guia.url);
      await expect(page.getByRole('heading', {level: 1, name: fm.title})).toBeVisible();
      const ficha = page.getByRole('complementary', {name: 'Ficha de la guía'});
      await expect(ficha).toBeVisible();
      await expect(ficha.locator('.badge-competencia')).toContainText(area(fm.area).nombre);
      await expect(ficha.locator('.badge-competencia')).toContainText(nombreNivel(fm.nivel));
      const items = ficha.getByRole('list', {name: 'Comportamientos que cubre'}).getByRole('listitem');
      await expect(items).toHaveCount(fm.comportamientos.length);
      await expect(items).toHaveText(fm.comportamientos.map(textoComportamiento));
      await expect(ficha.getByRole('link', {name: 'Ver la celda en el mapa'})).toHaveAttribute('href', `/mapa#${ancla(fm.area, fm.nivel)}`);
    });
  }

  test('el modo oscuro cambia el tema, deja el navbar oscuro y se conserva al recargar', async ({page}) => {
    await page.goto('/');
    const html = page.locator('html');
    const fondo = () => page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
    const fondoNavbar = () => page.evaluate(() => getComputedStyle(document.querySelector('nav.navbar')!).backgroundColor);
    const claro = await fondo();
    const navbarClaro = await fondoNavbar();

    const alternar = page.getByRole('button', {name: /Cambiar entre modo oscuro y claro/});
    // El botón recorre sistema -> claro -> oscuro (al entrar respeta la preferencia del sistema).
    await expect(html).toHaveAttribute('data-theme-choice', 'system');
    await alternar.click();
    await expect(html).toHaveAttribute('data-theme-choice', 'light');
    await alternar.click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    expect(await fondo()).not.toBe(claro);
    expect(await fondoNavbar()).toBe(navbarClaro);

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
