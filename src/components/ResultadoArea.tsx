import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Escala from './Escala';
import {textoMercado} from './Ficha';
import {buscarArea, buscarCelda, buscarRecurso, linkCelda, nombreNivel} from '../lib/competencias';
import {nivelDeValor, type ResultadoArea as Resultado} from '../lib/diagnostico';

interface Props {
  resultado: Resultado;
  /** Posición en el orden recomendado (1, 2, 3...). Sin número en mantenimiento. */
  orden?: number;
  /** Muestra el nivel objetivo usado para ordenar, si corresponde. */
  encabezadoNivel?: 'h3' | 'h4';
}

function textoValor(valor: number): string {
  const n = nivelDeValor(valor);
  return n ? `lo que hace alguien ${nombreNivel(n)}` : 'todavía no hice algo así';
}

/** Tarjeta de resultado por área (brandbook, "Tarjeta de resultado del autodiagnóstico"). */
export default function ResultadoArea({resultado, orden, encabezadoNivel = 'h3'}: Props): ReactNode {
  const area = buscarArea(resultado.areaId);
  if (!area || resultado.valor === null) return null;
  const Titulo = encabezadoNivel;
  const sinEmpezar = resultado.estado === 'sin_empezar';
  const nivel = resultado.nivel;
  const siguiente = resultado.siguiente;
  const esLead = nivel === 'lead';
  const celdaSiguiente = siguiente ? buscarCelda(area.id, siguiente) : undefined;
  const mercado = celdaSiguiente?.respaldo.mercado[0];
  const recursos = (celdaSiguiente?.recursos ?? [])
    .map((r) => ({...r, datos: buscarRecurso(r.recurso)}))
    .filter((r) => r.datos)
    .slice(0, 3);

  return (
    <article className="resultado" aria-label={`Resultado: ${area.nombre}`}>
      <div className="cab">
        <span className="rotulo" style={{margin: 0, color: 'var(--hq-tinta)'}}>
          {orden ? <span className="orden">{orden}. </span> : null}
          {area.nombre}
        </span>
        <span className="meta">
          {resultado.validas} de {resultado.total} respuestas
        </span>
      </div>
      <div className="cuerpo">
        {sinEmpezar ? (
          <Titulo>Tus respuestas indican que en esta área todavía no empezaste.</Titulo>
        ) : (
          <Titulo>
            Tus respuestas se parecen a lo que hace alguien <strong>{nivel ? nombreNivel(nivel) : ''}</strong> en esta área.
          </Titulo>
        )}
        <Escala actual={nivel} siguiente={esLead ? null : siguiente} />

        {resultado.desparejo && (
          <p className="aviso-desparejo">
            En esta área hacés cosas de niveles distintos. Es frecuente y es información útil.{' '}
            {resultado.brechas.length > 0
              ? 'Empezá por las preguntas que respondiste más abajo.'
              : 'Tu nivel es el de la mayoría de tus respuestas, y lo más alto que hacés es un buen punto de apoyo para el paso siguiente.'}
          </p>
        )}

        {resultado.brechas.length > 0 && nivel && (
          <div className="brechas">
            <span className="rotulo">Brechas dentro de tu nivel</span>
            <ul>
              {resultado.brechas.map((b) => {
                const pregunta = area.diagnostico.find((p) => p.id === b.preguntaId);
                return (
                  <li key={b.preguntaId}>
                    {pregunta?.enunciado} <span className="meta">Elegiste {textoValor(b.valor)}.</span>
                  </li>
                );
              })}
            </ul>
            <p>
              <Link to={linkCelda(area.id, nivel)}>Ver los comportamientos de {nombreNivel(nivel)} en el mapa</Link>
            </p>
          </div>
        )}

        {siguiente && celdaSiguiente && (
          <div className="paso-siguiente">
            <span className="rotulo" style={{margin: 0}}>
              {esLead ? 'Para mantener el nivel' : `Próximo paso: ${nombreNivel(siguiente)}`}
            </span>
            <ul className="paso-lista">
              {celdaSiguiente.comportamientos.map((c) => (
                <li key={c.id}>{c.texto}</li>
              ))}
            </ul>
            <div className="pregunta-evidencia">
              <b>Evidencia</b>
              <span>
                ¿Podrías mostrar esto? <em>{celdaSiguiente.evidencia}</em>
              </span>
            </div>
            {mercado && (
              <p className="meta mercado-linea">
                Mercado, {mercado.tema}: <strong className={`mercado-${mercado.categoria}`}>{textoMercado(mercado)}</strong>
              </p>
            )}
            {recursos.length > 0 && (
              <ul className="recursos" aria-label="Recursos para este paso">
                {recursos.map((r, i) => (
                  <li key={`${r.recurso}-${i}`}>
                    <a href={r.datos!.url} target="_blank" rel="noopener noreferrer">
                      {r.datos!.titulo}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <p>
              <Link to={linkCelda(area.id, siguiente)}>
                Ver la celda de {nombreNivel(siguiente)} en el mapa
              </Link>
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
