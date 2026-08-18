import { EntidadBase } from './common';

/**
 * País. Primer nivel de la jerarquía geográfica.
 */
export interface Pais extends EntidadBase {
  nombre: string;
  descripcion: string | null;
  ciudades?: Ciudad[];
}

/**
 * Ciudad dentro de un país. Segundo nivel de la jerarquía geográfica.
 */
export interface Ciudad extends EntidadBase {
  idPais: number;
  nombre: string;
  descripcion: string | null;
  pais?: Pais;
  departamentos?: Departamento[];
}

/**
 * Departamento dentro de una ciudad. Tercer nivel de la jerarquía geográfica.
 */
export interface Departamento extends EntidadBase {
  idCiudad: number;
  nombre: string;
  descripcion: string | null;
  ciudad?: Ciudad;
  lugares?: Lugar[];
}

/**
 * Ubicación física donde se realiza una actividad (CU14, CU16, CU48, CU50).
 */
export interface Lugar extends EntidadBase {
  nombre: string;
  descripcion: string | null;
  direccion: string;
  idDepartamento: number;
  departamento?: Departamento;
}

