/**
 * Columnas comunes a todas las entidades del modelo de dominio.
 * Corresponden a las marcas de tiempo e identificador generados por el backend.
 */
export interface EntidadBase {
  id: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/**
 * Forma común para entidades de tipo catálogo en el dominio.
 * Contiene un identificador `key` único de negocio, un `nombre` visible y una `descripcion` opcional.
 */
export interface EntidadCatalogo<K extends string = string> extends EntidadBase {
  nombre: string;
  key: K;
  descripcion: string | null;
}
