import { BaseEntity } from './common';

/**
 * País. Primer nivel de la jerarquía geográfica.
 */
export interface Country extends BaseEntity {
  name: string;
  description: string | null;
  cities?: City[];
}
/**
 * City dentro de un país. Segundo nivel de la jerarquía geográfica.
 */
export interface City extends BaseEntity {
  idCountry: number;
  name: string;
  description: string | null;
  country?: Country;
  departments?: Department[];
}

/**
 * Department dentro de una city. Tercer nivel de la jerarquía geográfica.
 */
export interface Department extends BaseEntity {
  idCity: number;
  name: string;
  description: string | null;
  city?: City;
  places?: Place[];
}

/**
 * Ubicación física donde se realiza una activity (CU14, CU16, CU48, CU50).
 */
export interface Place extends BaseEntity {
  name: string;
  description: string | null;
  address: string;
  idDepartment: number;
  department?: Department;
}
