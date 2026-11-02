import type {ReactNode} from 'react';
import Callout, {type TipoCallout} from '@site/src/components/Callout';

/**
 * Los admonitions de Infima se reemplazan por los callouts de la marca:
 *   :::tip      -> Tip
 *   :::caution  -> Ojo            (también :::warning)
 *   :::danger   -> Error común
 *   :::note     -> En la práctica (con título propio: :::note[Probalo así])
 * `info` y los alias heredados caen en Tip.
 */
function hacer(tipo: TipoCallout, tituloPorDefecto?: string) {
  return function AdmonitionHq(props: {title?: ReactNode; children?: ReactNode}): ReactNode {
    return (
      <Callout tipo={tipo} titulo={props.title ?? tituloPorDefecto}>
        {props.children}
      </Callout>
    );
  };
}

const tipos = {
  tip: hacer('tip'),
  info: hacer('tip'),
  success: hacer('tip'),
  important: hacer('tip'),
  secondary: hacer('tip'),
  caution: hacer('ojo'),
  warning: hacer('ojo'),
  danger: hacer('error'),
  note: hacer('practica'),
};

export default tipos;
