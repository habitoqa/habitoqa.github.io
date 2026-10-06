import {useEffect, useId, useMemo, useState, type ReactNode} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Glifo from './Glifo';
import ResultadoDiagnostico from './ResultadoDiagnostico';
import {competencias, nombreNivel} from '../lib/competencias';
import {construirQuery, esNivel} from '../lib/compartir';
import {diagnosticar, NIVELES, type Respuestas} from '../lib/diagnostico';
import {borrarEstado, guardarEstado, leerEstado} from '../lib/estado';
import type {NivelId, Pregunta} from '../lib/tipos';

/** Mezcla determinística (no cambia entre cargas ni entre servidor y cliente): las opciones de nivel
 *  salen en un orden que no delata cuál es "la más alta"; las dos opciones fijas van siempre al final. */
export function ordenarOpciones(pregunta: Pregunta): number[] {
  const indices = pregunta.opciones.map((_, i) => i);
  const fijas = indices.filter((i) => pregunta.opciones[i].nivel === null || pregunta.opciones[i].nivel === 'ninguno');
  const variables = indices.filter((i) => !fijas.includes(i));
  let semilla = 0;
  for (const c of pregunta.id) semilla = (semilla * 31 + c.charCodeAt(0)) >>> 0;
  const azar = () => {
    semilla = (Math.imul(semilla, 1664525) + 1013904223) >>> 0;
    return semilla / 2 ** 32;
  };
  for (let i = variables.length - 1; i > 0; i -= 1) {
    const j = Math.floor(azar() * (i + 1));
    [variables[i], variables[j]] = [variables[j], variables[i]];
  }
  return [...variables, ...fijas];
}

function PreguntaForm({
  pregunta,
  numero,
  total,
  valor,
  onElegir,
}: {
  pregunta: Pregunta;
  numero: number;
  total: number;
  valor: number | undefined;
  onElegir: (indice: number) => void;
}): ReactNode {
  const orden = useMemo(() => ordenarOpciones(pregunta), [pregunta]);
  return (
    <fieldset className="pregunta">
      <legend>
        <span className="meta">
          Pregunta {numero} de {total}
        </span>
        <span className="enunciado">{pregunta.enunciado}</span>
      </legend>
      <div className="opciones">
        {orden.map((i) => (
          <label key={i} className={`opcion${valor === i ? ' elegida' : ''}`}>
            <input
              type="radio"
              name={pregunta.id}
              value={i}
              checked={valor === i}
              onChange={() => onElegir(i)}
            />
            <span>{pregunta.opciones[i].texto}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function Cuestionario(): ReactNode {
  const [respuestas, setRespuestas] = useState<Respuestas>({});
  const [objetivo, setObjetivo] = useState<NivelId | null>(null);
  const [cargado, setCargado] = useState(false);
  const [areaActiva, setAreaActiva] = useState(competencias.areas[0].id);
  const [copiado, setCopiado] = useState(false);
  const [versionAnterior, setVersionAnterior] = useState(false);
  const idObjetivo = useId();
  const urlResultado = useBaseUrl('/autodiagnostico/resultado');

  // Carga del estado guardado, una vez montado el componente (en el servidor no hay localStorage).
  useEffect(() => {
    const {estado, versionAnterior: descartado} = leerEstado(competencias);
    if (estado) {
      setRespuestas(estado.respuestas);
      setObjetivo(estado.objetivo);
    }
    setVersionAnterior(descartado);
    setCargado(true);
  }, []);

  useEffect(() => {
    if (cargado) guardarEstado(competencias, {respuestas, objetivo});
  }, [respuestas, objetivo, cargado]);

  const diagnostico = useMemo(() => diagnosticar(competencias, respuestas, objetivo), [respuestas, objetivo]);
  const totalPreguntas = competencias.areas.reduce((n, a) => n + a.diagnostico.length, 0);
  const respondidas = Object.values(respuestas).filter((v) => v !== undefined).length;
  const area = competencias.areas.find((a) => a.id === areaActiva) ?? competencias.areas[0];
  const evaluadas = diagnostico.recomendaciones.length + diagnostico.mantenimiento.length;

  const elegir = (preguntaId: string, indice: number) =>
    setRespuestas((r) => ({...r, [preguntaId]: indice}));

  const borrarArea = () =>
    setRespuestas((r) => {
      const copia = {...r};
      for (const p of area.diagnostico) delete copia[p.id];
      return copia;
    });

  const empezarDeNuevo = () => {
    setRespuestas({});
    setObjetivo(null);
    borrarEstado();
  };

  const linkCompartir =
    typeof window === 'undefined'
      ? ''
      : `${window.location.origin}${urlResultado}?${construirQuery(competencias, respuestas, objetivo)}`;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(linkCompartir);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <div className="cuestionario" data-listo={cargado ? 'true' : undefined}>
      {versionAnterior && (
        <p className="vacio" role="alert">
          Tenías respuestas guardadas de una versión anterior del cuestionario. Las descartamos para no mezclarlas con las
          preguntas de ahora: empezás de cero.
        </p>
      )}
      <div className="progreso-global">
        <p role="status" className="progreso-texto">
          Respondiste <strong>{respondidas}</strong> de {totalPreguntas} preguntas. Podés hacerlo por partes: lo que
          respondas queda guardado en este navegador.
        </p>
        <div className="objetivo">
          <label htmlFor={idObjetivo}>Nivel objetivo (opcional)</label>
          <select
            id={idObjetivo}
            value={objetivo ?? ''}
            onChange={(e) => setObjetivo(esNivel(e.target.value) ? e.target.value : null)}>
            <option value="">Elegir automáticamente</option>
            {NIVELES.map((n) => (
              <option key={n} value={n}>
                {nombreNivel(n)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="cuestionario-grilla">
        <nav aria-label="Áreas" className="areas-nav">
          <ul>
            {competencias.areas.map((a) => {
              const r = diagnostico.areas.find((x) => x.areaId === a.id);
              const hechas = r?.respondidas ?? 0;
              const completa = hechas === a.diagnostico.length;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    className={`area-boton${a.id === areaActiva ? ' activa' : ''}${completa ? ' completa' : ''}`}
                    aria-pressed={a.id === areaActiva}
                    onClick={() => setAreaActiva(a.id)}>
                    <span className="area-nombre">{a.nombre}</span>
                    <span className="area-progreso">
                      {r?.nivel ? <Glifo nivel={r.nivel} /> : null}
                      <span className="meta" aria-hidden="true">
                        {hechas}/{a.diagnostico.length}
                      </span>
                      <span className="sr-only">
                        {r?.nivel ? `${nombreNivel(r.nivel)}, ` : ''}
                        {hechas} de {a.diagnostico.length}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <section className="area-form" aria-labelledby="area-titulo">
          <h2 id="area-titulo">{area.nombre}</h2>
          <p className="area-resumen">{area.resumen}</p>
          {area.diagnostico.map((p, i) => (
            <PreguntaForm
              key={p.id}
              pregunta={p}
              numero={i + 1}
              total={area.diagnostico.length}
              valor={respuestas[p.id]}
              onElegir={(indice) => elegir(p.id, indice)}
            />
          ))}
          <div className="acciones-area">
            <button type="button" className="boton-secundario" onClick={borrarArea}>
              Borrar las respuestas de esta área
            </button>
          </div>
        </section>
      </div>

      <section className="resultado-seccion" aria-labelledby="tu-resultado">
        <h2 id="tu-resultado">Tu resultado</h2>
        <ResultadoDiagnostico diagnostico={diagnostico} />

        {evaluadas > 0 && (
          <div className="compartir">
            <h3>Compartí tu resultado</h3>
            <p>
              El link lleva solo tus respuestas, sin datos personales. Quien lo abra lo ve en solo lectura.
            </p>
            <div className="compartir-fila">
              <label htmlFor="link-compartir" className="sr-only">
                Link para compartir tu resultado
              </label>
              <input id="link-compartir" type="text" readOnly value={linkCompartir} onFocus={(e) => e.target.select()} />
              <button type="button" className="boton-secundario" onClick={copiar}>
                {copiado ? 'Link copiado' : 'Copiar link'}
              </button>
            </div>
          </div>
        )}

        {respondidas > 0 && (
          <p>
            <button type="button" className="boton-texto" onClick={empezarDeNuevo}>
              Borrar todo y empezar de nuevo
            </button>
          </p>
        )}
      </section>
    </div>
  );
}
