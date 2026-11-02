import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Glifo from '../components/Glifo';
import Registro from '../components/Registro';

const PASOS: {nivel: 'inicial' | 'junior' | 'semi_senior'; titulo: string; texto: string}[] = [
  {
    nivel: 'inicial',
    titulo: 'Respondés situaciones reales',
    texto:
      '46 preguntas sobre qué hacés habitualmente. Cada opción describe un hábito de un nivel. Tarda unos 15 minutos, se puede hacer por partes y no guarda nada fuera de tu navegador.',
  },
  {
    nivel: 'junior',
    titulo: 'Ves tu nivel área por área',
    texto:
      '"Tus respuestas se parecen a lo que hace alguien Semi Senior en esta área." Nunca un título: un punto de partida.',
  },
  {
    nivel: 'semi_senior',
    titulo: 'Seguís con la celda siguiente',
    texto:
      'Comportamientos observables, la evidencia que lo demuestra y dónde aprenderlo, ordenado por lo que más pide el mercado.',
  },
];

export default function Inicio(): ReactNode {
  return (
    <Layout
      title="La calidad no es un acto, es un hábito"
      description="Averiguá en qué nivel estás en cada área de QA, qué te pide el mercado para el siguiente y con qué practicarlo.">
      <main>
        <section className="portada">
          <div className="envoltura grilla">
            <div>
              <span className="meta">12 áreas · 5 niveles · 100 avisos de 2026</span>
              <h1>
                La calidad no es un acto, es un <em>hábito.</em>
              </h1>
              <p className="cita">Adaptada de Will Durant (sobre Aristóteles)</p>
              <p className="bajada">
                Averiguá en qué nivel estás en cada área de QA, qué te pide el mercado para el siguiente y con qué
                practicarlo.
              </p>
              <div className="acciones">
                <Link className="boton" to="/autodiagnostico">
                  Empezar el autodiagnóstico
                </Link>
                <Link to="/mapa">Ver el mapa de competencias</Link>
              </div>
            </div>
            <Registro />
          </div>
        </section>

        <section className="seccion">
          <div className="envoltura">
            <span className="rotulo">Cómo funciona</span>
            <h2>Un diagnóstico que orienta, no un examen</h2>
            <ol className="pasos">
              {PASOS.map((p, i) => (
                <li key={p.titulo}>
                  <span className="n" role="img" aria-label={`Paso ${i + 1}`}>
                    <Glifo nivel={p.nivel} />
                  </span>
                  <h3>{p.titulo}</h3>
                  <p>{p.texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>
    </Layout>
  );
}
