import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Glifo from './Glifo';
import {estiloNivel} from './BadgeNivel';
import {buscarArea, linkCelda, nombreNivel} from '../lib/competencias';
import type {NivelId} from '../lib/tipos';

interface Props {
  /** Id del área en competencias.json (ui, cicd, seg_acc...). */
  area: string;
  nivel: NivelId;
  /** Por defecto enlaza a la celda del mapa. */
  sinLink?: boolean;
}

/** Tres partes pegadas: el área, el glifo del nivel y el nombre del nivel. */
export default function BadgeCompetencia({area, nivel, sinLink}: Props): ReactNode {
  const nombreArea = buscarArea(area)?.nombre ?? area;
  const cuerpo = (
    <>
      <span className="area">{nombreArea}</span>
      <span className="celda-glifo">
        <Glifo nivel={nivel} />
      </span>
      <span className="nv">{nombreNivel(nivel)}</span>
    </>
  );
  return sinLink ? (
    <span className="badge-competencia" style={estiloNivel(nivel)}>
      {cuerpo}
    </span>
  ) : (
    <Link className="badge-competencia badge-enlace" style={estiloNivel(nivel)} to={linkCelda(area, nivel)}>
      {cuerpo}
    </Link>
  );
}
