import type {ReactNode} from 'react';

export type TipoCallout = 'tip' | 'ojo' | 'error' | 'practica';

const ICONOS: Record<TipoCallout, ReactNode> = {
  tip: <path d="M4 12h15M13 6l6 6-6 6" />,
  ojo: <path d="M12 4v10M12 19v.5" />,
  error: <path d="M6 6l12 12M18 6L6 18" />,
  practica: <path d="M4 13l5 5L20 6" />,
};

const ETIQUETAS: Record<TipoCallout, string> = {
  tip: 'Tip',
  ojo: 'Ojo',
  error: 'Error común',
  practica: 'En la práctica',
};

interface Props {
  tipo: TipoCallout;
  /** Reemplaza la etiqueta por defecto. */
  titulo?: ReactNode;
  children?: ReactNode;
}

/**
 * Callout de marca: barra doble de 2 px, fondo tenue, etiqueta en Bricolage 700 con ícono de línea.
 * Se usa con las directivas de Markdown (:::tip, :::caution, :::danger, :::note) o directo en MDX.
 */
export default function Callout({tipo, titulo, children}: Props): ReactNode {
  return (
    <div className={`callout ${tipo}`} role="note">
      <div className="etq">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {ICONOS[tipo]}
        </svg>
        {titulo ?? ETIQUETAS[tipo]}
      </div>
      <div className="callout-cuerpo">{children}</div>
    </div>
  );
}
