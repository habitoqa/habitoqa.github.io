# Hábito QA

Sitio de calidad de software para ver en qué nivel está un QA, qué le falta según lo que pide el mercado y dónde aprenderlo. Está hecho con [Docusaurus 3](https://docusaurus.io) y se publica en <https://habitoqa.github.io>.

> La calidad no es un acto, es un hábito. (Adaptada de Will Durant, sobre Aristóteles.)

## Qué tiene

- **Autodiagnóstico** (`/autodiagnostico`): 46 situaciones en 12 áreas. Corre 100 % en el navegador, guarda el avance en `localStorage` y genera un link compartible de solo lectura (`/autodiagnostico/resultado?r=...`, sin datos personales y con `noindex`).
- **Mapa de competencias** (`/mapa`): matriz de 12 áreas por 5 niveles, con anclas `#<area>-<nivel>`. Sale de `src/data/competencias.json`, la única fuente de datos.
- **Guías** (`docs/guias/`): contenido propio organizado por área, no por herramienta.
- **Sobre el autor** (`/autor`): el único lugar con datos personales.

## Cómo correrlo

Requiere Node 20 o superior.

```bash
npm ci
npm start          # servidor de desarrollo en http://localhost:3000
npm run build      # build de producción (falla con links, anclas o rutas rotas)
npm run serve      # sirve el build en http://localhost:3000
```

## Cómo testear

```bash
npm run typecheck                 # TypeScript
npm test                          # unitarios (vitest): algoritmo del diagnóstico y lista de bloqueo
npm run build                     # los E2E corren contra el build
npx playwright install chromium   # una sola vez
npm run test:e2e                  # E2E (Playwright); levanta `docusaurus serve` solos
npm run bloqueo -- build          # datos personales fuera de /autor: tiene que dar 0
```

El algoritmo del autodiagnóstico es un módulo puro (`src/lib/diagnostico.ts`) con sus tests al lado. Los E2E están en `e2e/` y usan `getByRole` y `getByLabel`, sin esperas fijas.

## Estructura

```
docs/            Guías y /autor (Markdown/MDX)
e2e/             Tests E2E con Playwright
scripts/         Lista de bloqueo de datos personales
src/components/  Glifo, BadgeNivel, BadgeCompetencia, Ficha, Callout y resultado del diagnóstico
src/data/        competencias.json (no se edita a mano en un PR de contenido)
src/lib/         Algoritmo del diagnóstico, URL compartible y estado local
src/pages/       Home, mapa, autodiagnóstico y resultado compartido
```

## Cómo contribuir

1. Creá una rama y abrí un PR contra `main`. El PR usa la plantilla de `.github/pull_request_template.md`.
2. Toda guía declara en su frontmatter el área, el nivel, la celda del mapa y su respaldo (avisos de mercado o libros). Mirá cualquier guía de `docs/guias/` como ejemplo.
3. Escribí con ideas propias: no se copian párrafos de otras fuentes, se enlazan.
4. Sin nombres, fotos ni links personales fuera de `/autor`. El CI lo verifica con `gitleaks` y con la lista de bloqueo.
5. El CI tiene que pasar: typecheck, tests, build, E2E, `gitleaks` y lista de bloqueo. Con `main` en verde, el deploy a GitHub Pages es automático.

Los callouts se escriben con las directivas de Markdown: `:::tip` (Tip), `:::caution` (Ojo), `:::danger` (Error común) y `:::note` (En la práctica).
