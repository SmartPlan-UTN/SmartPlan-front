/**
 * Columnas comunes a todas las entities del model de dominio.
 * Corresponden a las marcas de tiempo e identificador generados por el backend.
 */
export interface BaseEntity {
  id: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/**
 * Forma común para entities de type catálogo en el dominio.
 * Contiene un identificador `key` único de negocio, un `name` visible y una `description` opcional.
 */
export interface CatalogEntity<K extends string = string> extends BaseEntity {
  name: string;
  key: K;
  description: string | null;
}
