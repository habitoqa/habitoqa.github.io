import type {ReactNode} from 'react';
import ResultadoArea from './ResultadoArea';
import {buscarArea, nombreNivel} from '../lib/competencias';
import type {Diagnostico} from '../lib/diagnostico';

interface Props {
  diagnostico: Diagnostico;
}

/** Resultado completo: recomendaciones en orden, mantenimiento y áreas sin datos. */
export default function ResultadoDiagnostico({diagnostico}: Props): ReactNode {
  const {recomendaciones, mantenimiento, sinDatos, objetivo, objetivoElegido} = diagnostico;
  const evaluadas = recomendaciones.length + mantenimiento.length;
  if (evaluadas === 0) {
    return (
      <p className="vacio">
        Todavía no hay áreas con respuestas suficientes. Respondé al menos 2 preguntas de un área para ver tu resultado.
      </p>
    );
  }
  return (
    <div className="resultado-completo">
      <p className="resumen-objetivo">
        Orden por prioridad, apuntando a <strong>{nombreNivel(objetivo)}</strong>
        {objetivoElegido ? ' (el objetivo que elegiste)' : ' (un nivel por encima de la mediana de tus áreas)'}.
        Primero lo que más pide el mercado, después la distancia que te separa del objetivo.
      </p>

      {recomendaciones.length > 0 && (
        <section aria-labelledby="por-donde-empezar">
          <h3 id="por-donde-empezar" className="subtitulo-resultado">
            Por dónde empezar
          </h3>
          <ol className="lista-resultados">
            {recomendaciones.map((r, i) => (
              <li key={r.areaId}>
                <ResultadoArea resultado={r.resultado} orden={i + 1} encabezadoNivel="h4" />
              </li>
            ))}
          </ol>
        </section>
      )}

      {mantenimiento.length > 0 && (
        <section aria-labelledby="mantenimiento">
          <h3 id="mantenimiento" className="subtitulo-resultado">
            Para mantener
          </h3>
          <p className="meta">Áreas donde ya estás en el nivel objetivo o por encima.</p>
          <ul className="lista-resultados">
            {mantenimiento.map((r) => (
              <li key={r.areaId}>
                <ResultadoArea resultado={r} encabezadoNivel="h4" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {sinDatos.length > 0 && (
        <p className="meta sin-datos">
          Sin datos suficientes todavía: {sinDatos.map((r) => buscarArea(r.areaId)?.nombre).join(', ')}.
        </p>
      )}
    </div>
  );
}
