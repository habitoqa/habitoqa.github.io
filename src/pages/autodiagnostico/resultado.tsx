import type {ReactNode} from 'react';
import {useEffect, useMemo, useState} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Head from '@docusaurus/Head';
import ResultadoDiagnostico from '../../components/ResultadoDiagnostico';
import {competencias} from '../../lib/competencias';
import {leerQuery} from '../../lib/compartir';
import {diagnosticar} from '../../lib/diagnostico';

/** Resultado compartido: solo lectura, sin formulario y sin tocar el localStorage de quien lo abre. */
export default function ResultadoCompartido(): ReactNode {
  // La query se lee después de montar: el HTML estático se genera sin ella y no debe diferir del primer render.
  const [lectura, setLectura] = useState<ReturnType<typeof leerQuery> | 'pendiente'>('pendiente');
  useEffect(() => {
    setLectura(leerQuery(competencias, window.location.search));
  }, []);
  const diagnostico = useMemo(
    () => (lectura && lectura !== 'pendiente' ? diagnosticar(competencias, lectura.respuestas, lectura.objetivo) : null),
    [lectura],
  );

  return (
    <Layout
      title="Resultado compartido"
      description="Un resultado del autodiagnóstico de Hábito QA, en solo lectura.">
      <Head>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <main className="pagina envoltura">
        <header className="pagina-cab">
          <span className="rotulo">Resultado compartido</span>
          <h1>Un autodiagnóstico, en solo lectura</h1>
          <p className="bajada">
            Alguien compartió este resultado con vos. Muestra a qué se parecen sus hábitos en cada área y no dice nada
            más sobre la persona. No se puede modificar desde acá.
          </p>
          <p>
            <Link className="boton" to="/autodiagnostico">
              Hacer mi propio autodiagnóstico
            </Link>
          </p>
        </header>
        {diagnostico ? (
          <section aria-labelledby="resultado-compartido">
            <h2 id="resultado-compartido">Resultado</h2>
            <ResultadoDiagnostico diagnostico={diagnostico} />
          </section>
        ) : lectura === 'pendiente' ? (
          <p className="vacio" role="status">
            Cargando el resultado...
          </p>
        ) : (
          <p className="vacio" role="alert">
            Este link no tiene un resultado válido. Puede estar cortado o ser de una versión anterior del cuestionario.
          </p>
        )}
      </main>
    </Layout>
  );
}
