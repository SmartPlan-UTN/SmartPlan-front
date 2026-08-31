import { BaseEntity } from './common';

/**
 * Country. First level of the geographic hierarchy.
 */
export interface Country extends BaseEntity {
  name: string;
  description: string | null;
  cities?: City[];
}
/**
 * City within a country. Second level of the geographic hierarchy.
 */
export interface City extends BaseEntity {
  idCountry: number;
  name: string;
  description: string | null;
  country?: Country;
  departments?: Department[];
}

/**
 * Department within a city. Third level of the geographic hierarchy.
 */
export interface Department extends BaseEntity {
  idCity: number;
  name: string;
  description: string | null;
  city?: City;
  places?: Place[];
}

/**
 * Physical location where an activity takes place (CU14, CU16, CU48, CU50).
 */
export interface Place extends BaseEntity {
  name: string;
  description: string | null;
  address: string;
  idDepartment: number;
  department?: Department;
}

/** Place catalog projection returned by `GET /places`. */
export interface PlaceOption {
  id: number;
  name: string;
  description: string | null;
  address: string;
  department: {
    id: number;
    name: string;
    city: {
      id: number;
      name: string;
      country: { id: number; name: string };
    };
  };
}

export interface PlaceListParams {
  search?: string;
  departmentId?: number;
  page?: number;
  limit?: number;
  direction?: 'asc' | 'desc';
}
