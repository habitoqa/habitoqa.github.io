/** Tipos de src/data/competencias.json (esquema habitoqa.competencias). */

export type NivelId = 'inicial' | 'junior' | 'semi_senior' | 'senior' | 'lead';

export interface Nivel {
  id: NivelId;
  nombre: string;
  orden: number;
  descripcion: string;
}

export interface Comportamiento {
  id: string;
  texto: string;
  variante?: string;
}

export interface ItemMercado {
  tema: string;
  categoria: string;
  conteo: string;
}

export interface Cita {
  aviso: string;
  contexto: string;
  texto: string;
}

export interface UbicacionRecurso {
  recurso: string;
  ubicacion: string | null;
}

export interface Celda {
  nivel: NivelId;
  comportamientos: Comportamiento[];
  evidencia: string;
  respaldo: {
    mercado: ItemMercado[];
    citas: Cita[];
    bibliografia: UbicacionRecurso[];
    nota?: string;
  };
  recursos: UbicacionRecurso[];
  comportamientos_variante?: Comportamiento[];
  evidencia_variante?: {variante: string; texto: string}[];
  peso_mercado: number;
}

export interface Opcion {
  texto: string;
  /** NivelId, 'ninguno' (Todavía no) o null (No aplica). */
  nivel: NivelId | 'ninguno' | null;
}

export interface Pregunta {
  id: string;
  enunciado: string;
  tipo: string;
  opciones: Opcion[];
}

export interface Area {
  id: string;
  nombre: string;
  prioridad_latam: number;
  resumen: string;
  celdas: Celda[];
  diagnostico: Pregunta[];
}

export interface Recurso {
  id: string;
  titulo: string;
  tipo: string;
  idioma: string;
  url: string;
}

export interface Competencias {
  esquema: string;
  version: string;
  niveles: Nivel[];
  categorias_mercado: Record<string, string>;
  recursos: Recurso[];
  areas: Area[];
  diagnostico: {
    valores: Record<string, number>;
    minimo_respuestas_validas: number;
    nivel_area: string;
    umbral_dispersion: number;
    peso_mercado: Record<string, number>;
  };
}
