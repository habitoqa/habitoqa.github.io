import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import prismTheme from './config/prismTheme';

const config: Config = {
  title: 'Hábito QA',
  tagline: 'La calidad no es un acto, es un hábito',
  favicon: 'img/favicon.svg',

  url: 'https://habitoqa.github.io',
  baseUrl: '/',
  trailingSlash: false,

  organizationName: 'habitoqa',
  projectName: 'habitoqa.github.io',

  // Todo link, ancla o ruta rota hace fallar el build.
  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',
  onDuplicateRoutes: 'throw',

  i18n: {
    defaultLocale: 'es',
    locales: ['es'],
  },

  markdown: {
    format: 'detect',
    hooks: {
      // En Docusaurus 3.10 esta opción vive en markdown.hooks (la de nivel raíz está deprecada).
      onBrokenMarkdownLinks: 'throw',
      onBrokenMarkdownImages: 'throw',
    },
  },

  stylesheets: [
    // Fuentes de la marca (brandbook, sección 4): una sola petición.
    'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Atkinson+Hyperlegible+Next:ital,wght@0,400;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap',
  ],
  headTags: [
    {tagName: 'link', attributes: {rel: 'preconnect', href: 'https://fonts.googleapis.com'}},
    {
      tagName: 'link',
      attributes: {rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous'},
    },
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          // Sin editUrl: las guías pasan por PR con revisión, no por edición directa.
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
        sitemap: {
          // Los resultados compartidos no se indexan.
          ignorePatterns: ['/autodiagnostico/resultado'],
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/og-image.png',
    metadata: [
      {
        name: 'description',
        content:
          'Averiguá en qué nivel estás en cada área de QA, qué te pide el mercado para el siguiente y con qué practicarlo.',
      },
    ],
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: '',
      style: 'dark',
      logo: {
        alt: 'Hábito QA',
        src: 'img/logo-negativo.svg',
        srcDark: 'img/logo-negativo.svg',
        width: 126,
        height: 26,
      },
      items: [
        {to: '/', label: 'Inicio', position: 'left', activeBaseRegex: '^/$'},
        {to: '/autodiagnostico', label: 'Autodiagnóstico', position: 'left', className: 'navbar-cta'},
        {to: '/mapa', label: 'Mapa', position: 'left'},
        {to: '/guias', label: 'Guías', position: 'left', activeBaseRegex: '^/guias'},
      ],
    },
    footer: {
      style: 'dark',
      // /autor vuelve al footer cuando el autor confirme el contenido de la página.
      links: [
        {
          title: 'Seguinos',
          items: [
            {label: 'Instagram', href: 'https://instagram.com/habitoqa'},
            {label: 'GitHub', href: 'https://github.com/habitoqa'},
          ],
        },
      ],
    },
    docs: {
      sidebar: {hideable: false},
    },
    prism: {
      theme: prismTheme,
      darkTheme: prismTheme,
      additionalLanguages: ['bash', 'yaml', 'json', 'typescript'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
