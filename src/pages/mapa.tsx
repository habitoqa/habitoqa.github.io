import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Link from '@docusaurus/Link';
import useBrokenLinks from '@docusaurus/useBrokenLinks';
import competencias from '@site/src/data/competencias.cliente.json';
import Ficha, {ETIQUETA_CATEGORIA} from '../components/Ficha';
import Glifo from '../components/Glifo';
import {estiloNivel} from '../components/BadgeNivel';
import {anclaCelda, nombreNivel} from '../lib/competencias';
import type {Competencias, NivelId} from '../lib/tipos';

const datos = competencias as unknown as Competencias;
const NIVELES: NivelId[] = datos.niveles.map((n) => n.id);

function MatrizArea({area}: {area: Competencias['areas'][number]}): ReactNode {
  return (
    <li className="matriz-fila">
      <Link className="matriz-area" to={`#${area.id.replace(/_/g, '-')}`}>
        {area.nombre}
      </Link>
      <ul className="matriz-celdas">
        {NIVELES.map((n) => {
          const celda = area.celdas.find((c) => c.nivel === n);
          const categoria = celda?.respaldo.mercado[0]?.categoria;
          return (
            <li key={n}>
              <Link
                className="matriz-celda"
                style={estiloNivel(n)}
                to={`#${anclaCelda(area.id, n)}`}
                aria-label={`${area.nombre}, ${nombreNivel(n)}${categoria ? `, ${ETIQUETA_CATEGORIA[categoria]}` : ''}`}>
                <Glifo nivel={n} />
                <span className="matriz-nivel">{nombreNivel(n)}</span>
                {categoria ? <span className="matriz-mercado">{ETIQUETA_CATEGORIA[categoria]}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </li>
  );
}

function SeccionArea({area}: {area: Competencias['areas'][number]}): ReactNode {
  const id = area.id.replace(/_/g, '-');
  const brokenLinks = useBrokenLinks();
  brokenLinks.collectAnchor(id);
  return (
    <section className="mapa-area" aria-labelledby={`${id}-nombre`}>
      <Heading as="h2" id={id}>
        <span id={`${id}-nombre`}>{area.nombre}</span>
      </Heading>
      <p className="area-resumen">{area.resumen}</p>
      <div className="mapa-celdas">
        {NIVELES.map((n) => (
          <Ficha key={n} area={area.id} nivel={n} />
        ))}
      </div>
      <p>
        <Link to="#matriz">Volver a la matriz</Link>
      </p>
    </section>
  );
}

export default function Mapa(): ReactNode {
  const brokenLinks = useBrokenLinks();
  brokenLinks.collectAnchor('matriz');
  return (
    <Layout
      title="Mapa de competencias"
      description="12 áreas por 5 niveles: comportamientos observables, señal de evidencia, respaldo del mercado y recursos para cada celda.">
      <main className="pagina envoltura">
        <header className="pagina-cab">
          <span className="rotulo">Mapa de competencias</span>
          <h1>12 áreas, 5 niveles, una celda para cada paso</h1>
          <p className="bajada">
            Cada celda dice qué hace alguien en ese nivel, qué evidencia lo demuestra, cuánto lo pide el mercado y con qué
            practicarlo. Las áreas están ordenadas por lo que más piden los avisos de LATAM hispano.
          </p>
          <p>
            <Link className="boton" to="/autodiagnostico">
              Empezar el autodiagnóstico
            </Link>
          </p>
        </header>

        <section id="matriz" aria-labelledby="matriz-titulo" className="matriz">
          <h2 id="matriz-titulo" className="sr-only">
            Matriz de competencias
          </h2>
          <ul className="matriz-lista">
            {datos.areas.map((a) => (
              <MatrizArea key={a.id} area={a} />
            ))}
          </ul>
          <p className="matriz-leyenda meta">
            Cada palote es un nivel. El check cierra el grupo: Lead. Debajo de cada glifo, cuánto lo piden los avisos del
            nivel.
          </p>
        </section>

        {datos.areas.map((a) => (
          <SeccionArea key={a.id} area={a} />
        ))}
      </main>
    </Layout>
  );
}
