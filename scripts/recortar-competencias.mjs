#!/usr/bin/env node
/**
 * Genera src/data/competencias.cliente.json: la versión de competencias.json que viaja en el bundle.
 * Saca lo que el cliente no usa (fuentes, rutas, especializaciones, notas de diseño, citas, bibliografía
 * de cada celda, categorías de mercado) para no mandar ~200 KB de datos que nadie muestra.
 * competencias.json sigue siendo la única fuente: este archivo se regenera (postinstall y prebuild) y no se versiona.
 */
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const origen = join(raiz, 'src/data/competencias.json');
const destino = join(raiz, 'src/data/competencias.cliente.json');

export function recortar(d) {
  return {
    niveles: d.niveles.map(({id, nombre, orden}) => ({id, nombre, orden})),
    recursos: d.recursos.map(({id, titulo, url}) => ({id, titulo, url})),
    areas: d.areas.map((a) => ({
      id: a.id,
      nombre: a.nombre,
      prioridad_latam: a.prioridad_latam,
      resumen: a.resumen,
      celdas: a.celdas.map((c) => ({
        nivel: c.nivel,
        comportamientos: c.comportamientos.map(({id, texto}) => ({id, texto})),
        evidencia: c.evidencia,
        respaldo: {mercado: c.respaldo.mercado, nota: c.respaldo.nota},
        recursos: c.recursos,
        ...(c.comportamientos_variante ? {comportamientos_variante: c.comportamientos_variante.map(({id, texto, variante}) => ({id, texto, variante}))} : {}),
        ...(c.evidencia_variante ? {evidencia_variante: c.evidencia_variante} : {}),
        peso_mercado: c.peso_mercado,
      })),
      diagnostico: a.diagnostico.map((p) => ({
        id: p.id,
        enunciado: p.enunciado,
        opciones: p.opciones.map(({texto, nivel}) => ({texto, nivel})),
      })),
    })),
    diagnostico: {
      minimo_respuestas_validas: d.diagnostico.minimo_respuestas_validas,
      umbral_dispersion: d.diagnostico.umbral_dispersion,
      peso_mercado: d.diagnostico.peso_mercado,
    },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const completo = JSON.parse(readFileSync(origen, 'utf8'));
  const recortado = JSON.stringify(recortar(completo));
  writeFileSync(destino, recortado);
  console.log(
    `competencias.cliente.json: ${(recortado.length / 1024).toFixed(0)} KB (de ${(readFileSync(origen).length / 1024).toFixed(0)} KB)`,
  );
}
