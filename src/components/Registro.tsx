import {useEffect, useState, type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Glifo from './Glifo';
import {competencias, nombreNivel} from '../lib/competencias';
import {diagnosticar} from '../lib/diagnostico';
import {leerEstado} from '../lib/estado';
import type {NivelId} from '../lib/tipos';

interface Fila {
  id: string;
  nombre: string;
  nivel: NivelId;
}

/** Ejemplo del preview de marca. Se muestra marcado como ejemplo hasta que haya un resultado guardado. */
const EJEMPLO: Fila[] = [
  {id: 'ui', nombre: 'Automatización de UI', nivel: 'semi_senior'},
  {id: 'cicd', nombre: 'CI/CD y entornos', nivel: 'junior'},
  {id: 'api', nombre: 'Testing de API', nivel: 'semi_senior'},
  {id: 'ingles', nombre: 'Inglés técnico', nivel: 'junior'},
  {id: 'diseno', nombre: 'Diseño de pruebas', nivel: 'senior'},
  {id: 'datos', nombre: 'Datos y SQL', nivel: 'inicial'},
];

/** Tarjeta "Tu registro" de la portada: tu resultado guardado en este navegador o, si no hay, un ejemplo. */
export default function Registro(): ReactNode {
  const [filas, setFilas] = useState<Fila[] | null>(null);

  useEffect(() => {
    const {estado: guardado} = leerEstado(competencias);
    if (!guardado) return;
    const d = diagnosticar(competencias, guardado.respuestas, guardado.objetivo);
    const propias = d.areas
      .filter((r) => r.nivel !== null)
      .map((r) => ({
        id: r.areaId,
        nombre: competencias.areas.find((a) => a.id === r.areaId)?.nombre ?? r.areaId,
        nivel: r.nivel as NivelId,
      }));
    if (propias.length) setFilas(propias);
  }, []);

  const esEjemplo = filas === null;
  const lista = filas ?? EJEMPLO;

  return (
    <aside className="registro" aria-label={esEjemplo ? 'Ejemplo de registro por área' : 'Tu registro por área'}>
      <header>
        <span className="rotulo" style={{margin: 0}}>
          Tu registro
        </span>
        <span className="meta">
          {esEjemplo ? 'Ejemplo · ' : ''}
          {lista.length} de {competencias.areas.length} áreas
        </span>
      </header>
      <ol>
        {lista.map((f) => (
          <li key={f.id}>
            <span className="reg-area">{f.nombre}</span>
            <span className="reg-glifo">
              <Glifo nivel={f.nivel} />
            </span>
            <span className="reg-nivel">{nombreNivel(f.nivel)}</span>
          </li>
        ))}
      </ol>
      <footer>
        {esEjemplo ? (
          <>
            <span className="marca-ejemplo">Esto es un ejemplo.</span> Tu registro aparece acá cuando hagas el
            autodiagnóstico. Cada palote es un nivel; el check cierra el grupo: Lead.
          </>
        ) : (
          <>
            Guardado solo en este navegador. <Link to="/autodiagnostico">Seguir con el autodiagnóstico</Link>
          </>
        )}
      </footer>
    </aside>
  );
}
