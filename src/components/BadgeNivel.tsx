import type {CSSProperties, ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Glifo from './Glifo';
import {nombreNivel} from '../lib/competencias';
import type {NivelId} from '../lib/tipos';

export function estiloNivel(nivel: NivelId): CSSProperties {
  const n = nivel.replace(/_/g, '-');
  return {
    ['--bg' as string]: `var(--hq-nivel-${n})`,
    ['--fg' as string]: `var(--hq-nivel-${n}-texto)`,
  };
}

interface Props {
  nivel: NivelId;
  /** Si se pasa, el badge es un link (por ejemplo, a la celda del mapa). */
  to?: string;
}

/** Etiqueta de dos partes: celda de color con el glifo y el nombre del nivel en mono. */
export default function BadgeNivel({nivel, to}: Props): ReactNode {
  const contenido = (
    <>
      <span className="celda-glifo">
        <Glifo nivel={nivel} />
      </span>
      <span className="txt">{nombreNivel(nivel)}</span>
    </>
  );
  return to ? (
    <Link className="badge-nivel badge-enlace" style={estiloNivel(nivel)} to={to}>
      {contenido}
    </Link>
  ) : (
    <span className="badge-nivel" style={estiloNivel(nivel)}>
      {contenido}
    </span>
  );
}
