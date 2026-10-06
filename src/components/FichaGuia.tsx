import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import BadgeCompetencia from './BadgeCompetencia';
import {competencias, buscarRecurso, linkCelda} from '../lib/competencias';
import type {NivelId} from '../lib/tipos';

interface Mercado {
  avisos?: string[];
  seccion?: string;
}
interface Libro {
  recurso: string;
  ubicacion?: string;
}
interface Alternativa {
  nombre: string;
  url: string;
  aporta?: string;
}
interface Herramienta {
  nombre: string;
  version: string | number;
}

/** Texto literal de un comportamiento a partir de su id estable (`<area>.<nivel>.<n>`). */
export function textoComportamiento(id: string): string | undefined {
  for (const area of competencias.areas) {
    for (const celda of area.celdas) {
      const c = celda.comportamientos.find((x) => x.id === id);
      if (c) return c.texto;
    }
  }
  return undefined;
}

function fecha(valor: unknown): string {
  if (!valor) return '';
  const d = new Date(String(valor));
  return Number.isNaN(d.getTime()) ? String(valor) : d.toISOString().slice(0, 10);
}

/**
 * Ficha de la guía: área y nivel, comportamientos cubiertos (texto literal de competencias.json),
 * evidencia, alternativa externa, herramientas y fecha de revisión. Todo sale del frontmatter.
 */
export default function FichaGuia(): ReactNode {
  const {frontMatter} = useDoc();
  const fm = frontMatter as Record<string, unknown>;
  const area = fm.area as string | undefined;
  const nivel = fm.nivel as NivelId | undefined;
  if (!area || !nivel) return null;

  const ids = (fm.comportamientos as string[] | undefined) ?? [];
  const respaldo = (fm.respaldo as {mercado?: Mercado[]; libros?: Libro[]} | undefined) ?? {};
  const mercado = respaldo.mercado ?? [];
  const libros = respaldo.libros ?? [];
  const alternativas = (fm.alternativa_externa as Alternativa[] | undefined) ?? [];
  const herramientas = (fm.herramientas as Herramienta[] | undefined) ?? [];
  const avisos = mercado.flatMap((m) => m.avisos ?? []);

  return (
    <aside className="ficha-guia" aria-label="Ficha de la guía" data-celda={`${area}.${nivel}`}>
      <span className="rotulo">Esta guía cubre</span>
      <p className="ficha-guia-badge">
        <BadgeCompetencia area={area} nivel={nivel} />
      </p>
      <ul className="comportamientos" aria-label="Comportamientos que cubre">
        {ids.map((id) => (
          <li key={id} data-comportamiento={id}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 13l6 6L21 5" />
            </svg>
            <span>{textoComportamiento(id) ?? id}</span>
          </li>
        ))}
      </ul>
      <dl className="ficha-guia-datos">
        <div>
          <dt>Evidencia</dt>
          <dd>
            {avisos.length > 0 ? (
              <>
                Avisos de mercado {avisos.join(', ')}
                {mercado.find((m) => m.seccion)?.seccion ? ` (${mercado.find((m) => m.seccion)?.seccion})` : ''}
              </>
            ) : (
              'Sin avisos de mercado: se apoya en libros.'
            )}
            {libros.length > 0 && (
              <ul>
                {libros.map((l) => {
                  const r = buscarRecurso(l.recurso);
                  return (
                    <li key={`${l.recurso}-${l.ubicacion}`}>
                      {r ? (
                        <a href={r.url} target="_blank" rel="noopener noreferrer">
                          {r.titulo}
                        </a>
                      ) : (
                        l.recurso
                      )}
                      {l.ubicacion ? <span className="ubicacion">, {l.ubicacion}</span> : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </dd>
        </div>
        {alternativas.length > 0 && (
          <div>
            <dt>Afuera</dt>
            <dd>
              <ul>
                {alternativas.map((a) => (
                  <li key={a.url}>
                    <a href={a.url} target="_blank" rel="noopener noreferrer">
                      {a.nombre}
                    </a>
                    {a.aporta ? <span className="ubicacion">. {a.aporta}</span> : null}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        )}
        {herramientas.length > 0 && (
          <div>
            <dt>Herramientas</dt>
            <dd>{herramientas.map((h) => `${h.nombre} ${h.version}`).join(', ')}</dd>
          </div>
        )}
        <div>
          <dt>Celda</dt>
          <dd>
            <Link to={linkCelda(area, nivel)}>Ver la celda en el mapa</Link>
          </dd>
        </div>
        {fm.ultima_revision ? (
          <div>
            <dt>Revisada</dt>
            <dd>{fecha(fm.ultima_revision)}</dd>
          </div>
        ) : null}
      </dl>
    </aside>
  );
}
