import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { getApiBaseUrl } from './config';
import { getToken } from './token-provider';
import { notifyUnauthorized } from './auth-events';
import { normalizarError } from './errors';

/**
 * Opciones de configuración para las peticiones de apiClient, omitiendo `url` y `method`.
 */
export type RequestConfig = Omit<AxiosRequestConfig, 'url' | 'method'>;

/**
 * Instancia privada centralizada de Axios.
 * Configurada con timeouts, headers por defecto e interceptores para JWT y manejo de errores.
 */
const instance = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Interceptor de solicitud:
 * - Resuelve dinámicamente la URL base mediante `getApiBaseUrl()`.
 * - Adjunta el header `Authorization: Bearer <token>` cuando hay un JWT disponible.
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
    return Promise.reject(normalizarError(error));
  }
);

/**
 * Interceptor de respuesta:
 * - Captura errores de respuesta.
 * - Si el error es 401 (Unauthorized), notifica al bus de eventos mediante `notifyUnauthorized()`.
 * - Garantiza que todas las excepciones lanzadas sean de tipo `ApiError`.
 */
instance.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = normalizarError(error);

    if (apiError.es401) {
      notifyUnauthorized();
    }

    return Promise.reject(apiError);
  }
);

/**
 * Cliente HTTP centralizado de SmartPlan.
 * Proporciona métodos tipados para realizar peticiones a la API sin exponer detalles de Axios.
 */
export const apiClient = {
  /**
   * Realiza una petición HTTP GET.
   *
   * @template T Tipo esperado de los datos de respuesta.
   * @param url Ruta o endpoint relativo.
   * @param config Configuración adicional de la petición.
   * @returns Datos devueltos por el servidor.
   */
  async get<T>(url: string, config?: RequestConfig): Promise<T> {
    try {
      const response = await instance.get<T>(url, config);
      return response.data;
    } catch (error) {
      throw normalizarError(error);
    }
  },

  /**
   * Realiza una petición HTTP POST.
   *
   * @template T Tipo esperado de los datos de respuesta.
   * @param url Ruta o endpoint relativo.
   * @param data Cuerpo de la petición.
   * @param config Configuración adicional de la petición.
   * @returns Datos devueltos por el servidor.
   */
  async post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    try {
      const response = await instance.post<T>(url, data, config);
      return response.data;
    } catch (error) {
      throw normalizarError(error);
    }
  },

  /**
   * Realiza una petición HTTP PUT.
   *
   * @template T Tipo esperado de los datos de respuesta.
   * @param url Ruta o endpoint relativo.
   * @param data Cuerpo de la petición.
   * @param config Configuración adicional de la petición.
   * @returns Datos devueltos por el servidor.
   */
  async put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    try {
      const response = await instance.put<T>(url, data, config);
      return response.data;
    } catch (error) {
      throw normalizarError(error);
    }
  },

  /**
   * Realiza una petición HTTP PATCH.
   *
   * @template T Tipo esperado de los datos de respuesta.
   * @param url Ruta o endpoint relativo.
   * @param data Cuerpo de la petición.
   * @param config Configuración adicional de la petición.
   * @returns Datos devueltos por el servidor.
   */
  async patch<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    try {
      const response = await instance.patch<T>(url, data, config);
      return response.data;
    } catch (error) {
      throw normalizarError(error);
    }
  },

  /**
   * Realiza una petición HTTP DELETE.
   *
   * @template T Tipo esperado de los datos de respuesta.
   * @param url Ruta o endpoint relativo.
   * @param config Configuración adicional de la petición.
   * @returns Datos devueltos por el servidor.
   */
  async delete<T>(url: string, config?: RequestConfig): Promise<T> {
    try {
      const response = await instance.delete<T>(url, config);
      return response.data;
    } catch (error) {
      throw normalizarError(error);
    }
  },

  /**
   * Permite realizar peticiones avanzadas especificando la configuración completa de Axios.
   * Útil cuando se requiere acceder a cabeceras de respuesta o metadatos de HTTP.
   *
   * @template T Tipo esperado del cuerpo de respuesta.
   * @param config Configuración de petición completa.
   * @returns Objeto de respuesta completo de Axios.
   */
  async request<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    try {
      return await instance.request<T>(config);
    } catch (error) {
      throw normalizarError(error);
    }
  },
};
