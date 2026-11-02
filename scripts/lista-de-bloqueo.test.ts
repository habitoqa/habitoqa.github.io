import {execFileSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {escanearBuild, escanearFuente} from './lista-de-bloqueo.mjs';

// Los datos de prueba se arman con fragmentos para que este archivo no los contenga literales.
const USUARIO = ['db', 'quir', 'oga'].join('');
const APELLIDO = ['Quir', 'oga'].join('');
const NOMBRE = ['Day', 'hana'].join('');
const EMAIL_CORRIDO = ['db.', 'quir', 'oga93@example.com'].join('');
const LINKEDIN = ['linkedin.com/', 'in/alguien'].join('');
const FOTO = ['m', 'e.png'].join('');

/** Repo git temporal con los archivos dados, ya agregados al índice. */
function repo(archivos: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'hq-fuente-'));
  execFileSync('git', ['init', '-q'], {cwd: dir});
  for (const [ruta, contenido] of Object.entries(archivos)) {
    mkdirSync(dirname(join(dir, ruta)), {recursive: true});
    writeFileSync(join(dir, ruta), contenido);
  }
  execFileSync('git', ['add', '-A'], {cwd: dir});
  return dir;
}

/** Imita la estructura real de `docusaurus build`: html por ruta (sin trailing slash) y chunks con hash. */
function build(archivos: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'hq-build-'));
  const base: Record<string, string> = {
    'index.html': '<html><head><script src="/assets/js/runtime~main.4f2a1c9d.js"></script></head><body>Hábito QA</body></html>',
    'mapa.html': '<html><body>Mapa</body></html>',
    'guias.html': '<html><body>Guías</body></html>',
    'guias/ui.html': '<html><body>UI</body></html>',
    'sitemap.xml': '<urlset><url><loc>https://habitoqa.github.io/mapa</loc></url></urlset>',
    'assets/js/runtime~main.4f2a1c9d.js': 'var runtime = {};',
    'assets/js/main.8be10c33.js': 'var main = {};',
    'assets/css/styles.0a1b2c3d.css': 'body{margin:0}',
  };
  for (const [ruta, contenido] of Object.entries({...base, ...archivos})) {
    mkdirSync(dirname(join(dir, ruta)), {recursive: true});
    writeFileSync(join(dir, ruta), contenido);
  }
  return dir;
}

const archivosConHallazgos = (h: {archivo: string}[]) => [...new Set(h.map((x) => x.archivo))].sort();
const patrones = (h: {patron: string}[]) => [...new Set(h.map((x) => x.patron))].sort();

describe('escaneo de la fuente versionada', () => {
  it('pasa con un repo limpio', () => {
    const dir = repo({'README.md': '# Hábito QA', 'docs/guias/index.md': 'Guías', 'e2e/smoke.spec.ts': 'test()'});
    expect(escanearFuente(dir).hallazgos).toEqual([]);
  });

  it('encuentra usuario, apellido, nombre, email, LinkedIn y foto en README, e2e, package.json y docs', () => {
    const dir = repo({
      'README.md': `Autor: ${USUARIO}`,
      'e2e/smoke.spec.ts': `// ${APELLIDO}`,
      'package.json': `{"author": "${NOMBRE}"}`,
      'docs/guias/ui/x.md': `escribime a ${EMAIL_CORRIDO}`,
      'docs/guias/ui/y.md': `https://${LINKEDIN}`,
      'src/pages/foto.tsx': `<img src="/img/${FOTO}" />`,
    });
    const {hallazgos} = escanearFuente(dir);
    expect(archivosConHallazgos(hallazgos)).toEqual([
      'README.md',
      'docs/guias/ui/x.md',
      'docs/guias/ui/y.md',
      'e2e/smoke.spec.ts',
      'package.json',
      'src/pages/foto.tsx',
    ]);
    expect(patrones(hallazgos)).toEqual(
      ['LinkedIn personal', 'apellido', 'email personal', 'foto personal', 'nombre de pila', 'usuario personal'].sort(),
    );
  });

  it('informa archivo y línea', () => {
    const dir = repo({'README.md': `uno\ndos ${USUARIO}\ntres`});
    expect(escanearFuente(dir).hallazgos[0]).toMatchObject({archivo: 'README.md', linea: 2});
  });

  it('permite todo en docs/autor/**', () => {
    const dir = repo({'docs/autor/index.md': `${NOMBRE} ${APELLIDO} ${USUARIO} https://${LINKEDIN}`});
    expect(escanearFuente(dir).hallazgos).toEqual([]);
  });

  it('permite el campo repo: de un caso de estudio, pero no otros usos del usuario en el mismo archivo', () => {
    const ok = repo({
      'docs/proyectos/caso.md': `---\ntitle: Caso\nrepo: https://github.com/${USUARIO}/inventario-hogar\n---\nTexto`,
    });
    expect(escanearFuente(ok).hallazgos).toEqual([]);
    const mal = repo({
      'docs/proyectos/caso.md': `---\nrepo: https://github.com/${USUARIO}/inventario-hogar\n---\nVisitá https://github.com/${USUARIO}/otro`,
      'docs/guias/ui/z.md': `repo: https://github.com/${USUARIO}/inventario-hogar`,
    });
    const {hallazgos} = escanearFuente(mal);
    expect(archivosConHallazgos(hallazgos)).toEqual(['docs/guias/ui/z.md', 'docs/proyectos/caso.md']);
    expect(hallazgos.filter((h: {archivo: string}) => h.archivo === 'docs/proyectos/caso.md')[0]).toMatchObject({linea: 4});
  });

  it('ignora binarios y archivos no versionados', () => {
    const dir = repo({'static/img/foto.png': USUARIO});
    writeFileSync(join(dir, 'sin-versionar.md'), USUARIO);
    expect(escanearFuente(dir).hallazgos).toEqual([]);
  });
});

describe('escaneo del build (sin excepciones)', () => {
  it('pasa con un build limpio de la estructura real', () => {
    expect(escanearBuild(build({})).hallazgos).toEqual([]);
  });

  it('encuentra datos personales en html, chunks de JS, css y sitemap', () => {
    const dir = build({
      'guias/ui.html': `<html>${USUARIO}</html>`,
      'assets/js/main.8be10c33.js': `var e="${EMAIL_CORRIDO}"`,
      'assets/css/styles.0a1b2c3d.css': `/* ${APELLIDO} */`,
      'sitemap.xml': `<loc>https://${LINKEDIN}</loc>`,
    });
    const {hallazgos} = escanearBuild(dir);
    expect(archivosConHallazgos(hallazgos)).toEqual([
      'assets/css/styles.0a1b2c3d.css',
      'assets/js/main.8be10c33.js',
      'guias/ui.html',
      'sitemap.xml',
    ]);
  });

  it('no tiene excepciones: autor.html con datos también falla y se avisa que hay /autor', () => {
    const dir = build({'autor.html': `<html>${NOMBRE} ${APELLIDO}</html>`});
    const r = escanearBuild(dir);
    expect(archivosConHallazgos(r.hallazgos)).toEqual(['autor.html']);
    expect(r.hayAutor).toBe(true);
    expect(escanearBuild(build({})).hayAutor).toBe(false);
  });
});
