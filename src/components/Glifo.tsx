import {useId, type ReactNode} from 'react';
import type {NivelId} from '../lib/tipos';

/** Cantidad de palotes por nivel: Inicial 1, Junior 2, Semi Senior 3, Senior 4, Lead 4 + check. */
const PALOTES: Record<NivelId, string> = {
  inicial: 'M20 12V56',
  junior: 'M20 12V56M29 12V56',
  semi_senior: 'M20 12V56M29 12V56M38 12V56',
  senior: 'M20 12V56M29 12V56M38 12V56M47 12V56',
  lead: 'M20 12V56M29 12V56M38 12V56M47 12V56',
};

interface Props {
  nivel: NivelId;
  className?: string;
  /** Texto alternativo. Sin título el glifo es decorativo (aria-hidden). */
  titulo?: string;
}

/**
 * El conteo: palotes (uno por nivel) y, en Lead, el grupo cerrado por el check.
 * Se pinta con `currentColor`; el check usa --glifo-check (por defecto --hq-marca).
 */
export default function Glifo({nivel, className, titulo}: Props): ReactNode {
  const id = useId();
  const mascara = `hq-glifo-${id.replace(/:/g, '')}`;
  const esLead = nivel === 'lead';
  return (
    <svg
      className={['glifo', className].filter(Boolean).join(' ')}
      viewBox="0 2 64 60"
      fill="none"
      strokeWidth={6}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={titulo ? 'img' : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
      focusable="false">
      {esLead && (
        <mask id={mascara} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
          <rect width="64" height="64" fill="#fff" />
          <path d="M4 43L11 50L57 6" fill="none" stroke="#000" strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
        </mask>
      )}
      <path d={PALOTES[nivel]} stroke="currentColor" mask={esLead ? `url(#${mascara})` : undefined} />
      {esLead && <path d="M4 43L11 50L57 6" stroke="var(--glifo-check, var(--hq-marca))" />}
    </svg>
  );
}
