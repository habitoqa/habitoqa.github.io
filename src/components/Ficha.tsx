import type {ReactNode} from 'react';
import useBrokenLinks from '@docusaurus/useBrokenLinks';
import BadgeNivel from './BadgeNivel';
import {anclaCelda, buscarArea, buscarCelda, buscarRecurso} from '../lib/competencias';
import type {Celda, ItemMercado, NivelId, UbicacionRecurso} from '../lib/tipos';

export const ETIQUETA_CATEGORIA: Record<string, string> = {
  requerido: 'requerido',
  diferencial: 'diferencial',
  marginal: 'marginal',
  no_aplica: 'sin avisos',
  evidencia_insuficiente: 'evidencia insuficiente',
  sin_tema: 'sin dato de mercado',
};

/** "requerido (13 / 19 de 21)": categoría y conteo, en el formato de competencias.md §4. */
export function textoMercado(item: ItemMercado): string {
  const categoria = ETIQUETA_CATEGORIA[item.categoria] ?? item.categoria;
  return item.conteo ? `${categoria} (${item.conteo})` : categoria;
}

function Recursos({recursos}: {recursos: UbicacionRecurso[]}): ReactNode {
  if (!recursos.length) return null;
  return (
    <ul className="recursos" aria-label="Recursos">
      {recursos.map((r, i) => {
        const recurso = buscarRecurso(r.recurso);
        if (!recurso) return null;
        return (
          <li key={`${r.recurso}-${i}`}>
            <a href={recurso.url} target="_blank" rel="noopener noreferrer">
              {recurso.titulo}
            </a>
            {r.ubicacion ? <span className="ubicacion"> · {r.ubicacion}</span> : null}
          </li>
        );
      })}
    </ul>
  );
}

function Check(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 13l6 6L21 5" />
    </svg>
  );
}

interface Props {
  area: string;
  nivel: NivelId;
  /** Nivel del título (h3 por defecto). */
  encabezado?: 'h3' | 'h4';
  /** Muestra el nombre del área como título (para usarla fuera del mapa). */
  conArea?: boolean;
}

/**
 * Celda de la matriz: comportamientos observables, señal de evidencia, respaldo y recursos.
 * Lleva `id="<area>-<nivel>"` y lo registra para que `onBrokenAnchors` conozca el ancla.
 */
export default function Ficha({area, nivel, encabezado = 'h3', conArea = false}: Props): ReactNode {
  const datosArea = buscarArea(area);
  const celda: Celda | undefined = buscarCelda(area, nivel);
  const id = anclaCelda(area, nivel);
  const brokenLinks = useBrokenLinks();
  brokenLinks.collectAnchor(id);
  if (!datosArea || !celda) return null;

  const Titulo = encabezado;
  const respaldo = celda.respaldo;
  const variantes = celda.comportamientos_variante ?? [];
  const evidenciaVariante = celda.evidencia_variante ?? [];
  const recursos = celda.recursos;

  return (
    <article className="celda" id={id} aria-labelledby={`${id}-titulo`}>
      <div className="cab">
        <span className="ruta">
          {area.replace(/_/g, '-')} / {nivel.replace(/_/g, '-')}
        </span>
        <BadgeNivel nivel={nivel} />
      </div>
      <div className="cuerpo">
        <Titulo id={`${id}-titulo`} className="celda-titulo">
          {conArea ? datosArea.nombre : nivelTitulo(nivel)}
        </Titulo>
        <ul className="comportamientos" aria-label="Comportamientos observables">
          {celda.comportamientos.map((c) => (
            <li key={c.id}>
              <Check />
              <span>{c.texto}</span>
            </li>
          ))}
        </ul>

        {variantes.length > 0 && (
          <details className="variante">
            <summary>Variante mobile</summary>
            <ul className="comportamientos" aria-label="Comportamientos de la variante mobile">
              {variantes.map((c) => (
                <li key={c.id}>
                  <Check />
                  <span>{c.texto}</span>
                </li>
              ))}
            </ul>
            {evidenciaVariante.map((e) => (
              <p className="evidencia" key={e.variante}>
                <b>Señal de evidencia (mobile)</b>
                {e.texto}
              </p>
            ))}
          </details>
        )}

        <p className="evidencia">
          <b>Señal de evidencia</b>
          {celda.evidencia}
        </p>

        <div className="respaldo">
          {respaldo.mercado.map((m) => (
            <span key={m.tema}>
              {m.tema}: <strong className={`mercado-${m.categoria}`}>{textoMercado(m)}</strong>
            </span>
          ))}
        </div>
        {respaldo.nota ? <p className="nota-respaldo">{respaldo.nota}</p> : null}
        <Recursos recursos={recursos} />
      </div>
    </article>
  );
}

function nivelTitulo(nivel: NivelId): string {
  return {inicial: 'Inicial', junior: 'Junior', semi_senior: 'Semi Senior', senior: 'Senior', lead: 'Lead'}[nivel];
}
