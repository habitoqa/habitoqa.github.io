import type {ReactNode} from 'react';
import Glifo from './Glifo';
import {estiloNivel} from './BadgeNivel';
import {nombreNivel} from '../lib/competencias';
import {NIVELES} from '../lib/diagnostico';
import type {NivelId} from '../lib/tipos';

interface Props {
  /** Nivel alcanzado (null si todavía no empezó). */
  actual: NivelId | null;
  siguiente: NivelId | null;
}

/** Cinco celdas iguales con su glifo: la alcanzada dice "hoy", la siguiente "próximo". */
export default function Escala({actual, siguiente}: Props): ReactNode {
  return (
    <ol className="escala" aria-label="Escala de niveles">
      {NIVELES.map((n) => {
        const esActual = n === actual;
        const esSiguiente = !esActual && n === siguiente;
        return (
          <li
            key={n}
            className={esActual ? 'actual' : esSiguiente ? 'siguiente' : ''}
            style={estiloNivel(n)}
            aria-current={esActual ? 'step' : undefined}>
            <span className="esc-marca">
              <Glifo nivel={n} />
            </span>
            <span className="esc-nombre">{nombreNivel(n)}</span>
            <span className="esc-estado">{esActual ? 'hoy' : esSiguiente ? 'próximo' : ''}</span>
          </li>
        );
      })}
    </ol>
  );
}
