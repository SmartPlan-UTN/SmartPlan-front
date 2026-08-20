import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { getApiBaseUrl } from './config';
import { getToken } from './token-provider';
import { notifyUnauthorized } from './auth-events';
import { normalizeError } from './errors';

/**
 * Options de configuración para las peticiones de apiClient, omitiendo `url` y `method`.
 */
export type RequestConfig = Omit<AxiosRequestConfig, 'url' | 'method'>;

/**
 * Instancia privada centralizada de Axios.
 * Configurada con timeouts, headers por defecto e interceptores para JWT y manejo de errors.
 */
const instance = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Interceptor de request:
 * - Resuelve dinámicamente la URL base mediante `getApiBaseUrl()`.
 * - Adjunta el header `Authorization: Bearer <token>` cuando hay un JWT available.
 * - Evita enviar el token a dominios externos distintos a la API de SmartPlan.
 */
instance.interceptors.request.use(
  async (config) => {
    const baseUrl = config.baseURL || getApiBaseUrl();
    config.baseURL = baseUrl;

    const token = await getToken();
    if (token && config.headers) {
      // Verifica si la petición es relativa o pertenece al mismo origen de nuestra API
      const esMismoOrigen =
        !config.url ||
        config.url.startsWith('/') ||
        config.url.startsWith(baseUrl);

      if (esMismoOrigen) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error: unknown) => {
    return Promise.reject(normalizeError(error));
  }
);

/**
 * Interceptor de response:
 * - Captura errors de response.
 * - Si el error es 401 (Unauthorized), notifica al bus de eventos mediante `notifyUnauthorized()`.
 * - Garantiza que todas las excepciones lanzadas sean de type `ApiError`.
 */
instance.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = normalizeError(error);

    if (apiError.isUnauthorized) {
      notifyUnauthorized();
    }

    return Promise.reject(apiError);
  }
);

/**
 * Cliente HTTP centralizado de SmartPlan.
 * Proporciona métodos tipados para realizar peticiones a la API sin exponer details de Axios.
 */
export const apiClient = {
  /**
   * Realiza una petición HTTP GET.
   *
   * @template T Tipo esperado de los data de response.
   * @param url Route o endpoint relativo.
   * @param config Configuración adicional de la petición.
   * @returns Data devueltos por el servidor.
   */
  async get<T>(url: string, config?: RequestConfig): Promise<T> {
    try {
      const response = await instance.get<T>(url, config);
      return response.data;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  /**
   * Realiza una petición HTTP POST.
   *
   * @template T Tipo esperado de los data de response.
   * @param url Route o endpoint relativo.
   * @param data Cuerpo de la petición.
   * @param config Configuración adicional de la petición.
   * @returns Data devueltos por el servidor.
   */
  async post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    try {
      const response = await instance.post<T>(url, data, config);
      return response.data;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  /**
   * Realiza una petición HTTP PUT.
   *
   * @template T Tipo esperado de los data de response.
   * @param url Route o endpoint relativo.
   * @param data Cuerpo de la petición.
   * @param config Configuración adicional de la petición.
   * @returns Data devueltos por el servidor.
   */
  async put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    try {
      const response = await instance.put<T>(url, data, config);
      return response.data;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  /**
   * Realiza una petición HTTP PATCH.
   *
   * @template T Tipo esperado de los data de response.
   * @param url Route o endpoint relativo.
   * @param data Cuerpo de la petición.
   * @param config Configuración adicional de la petición.
   * @returns Data devueltos por el servidor.
   */
  async patch<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    try {
      const response = await instance.patch<T>(url, data, config);
      return response.data;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  /**
   * Realiza una petición HTTP DELETE.
   *
   * @template T Tipo esperado de los data de response.
   * @param url Route o endpoint relativo.
   * @param config Configuración adicional de la petición.
   * @returns Data devueltos por el servidor.
   */
  async delete<T>(url: string, config?: RequestConfig): Promise<T> {
    try {
      const response = await instance.delete<T>(url, config);
      return response.data;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  /**
   * Permite realizar peticiones avanzadas especificando la configuración completa de Axios.
   * Útil cuando se requiere acceder a cabeceras de response o metadata de HTTP.
   *
   * @template T Tipo esperado del body de response.
   * @param config Configuración de petición completa.
   * @returns Objeto de response completo de Axios.
   */
  async request<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    try {
      return await instance.request<T>(config);
    } catch (error) {
      throw normalizeError(error);
    }
  },
};
