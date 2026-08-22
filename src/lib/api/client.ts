import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { getApiBaseUrl } from './config';
import { getToken } from './token-provider';
import { notifyUnauthorized } from './auth-events';
import { normalizeError } from './errors';

/**
 * Configuration options for apiClient requests, omitting `url` and `method`.
 */
export type RequestConfig = Omit<AxiosRequestConfig, 'url' | 'method'>;

/**
 * Private centralized Axios instance.
 * Configured with timeouts, default headers, and interceptors for JWT and error handling.
 */
const instance = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor:
 * - Dynamically resolves the base URL through `getApiBaseUrl()`.
 * - Attaches the `Authorization: Bearer <token>` header when a JWT is available.
 * - Avoids sending the token to external domains other than the SmartPlan API.
 */
instance.interceptors.request.use(
  async (config) => {
    const baseUrl = config.baseURL || getApiBaseUrl();
    config.baseURL = baseUrl;

    const token = await getToken();
    if (token && config.headers) {
      // Check whether the request is relative or targets our own API origin
      const isSameOrigin =
        !config.url ||
        config.url.startsWith('/') ||
        config.url.startsWith(baseUrl);

      if (isSameOrigin) {
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
 * Response interceptor:
 * - Captures response errors.
 * - If the error is a 401 (Unauthorized), notifies the event bus through `notifyUnauthorized()`.
 * - Ensures every thrown exception is an `ApiError`.
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
 * Centralized HTTP client for SmartPlan.
 * Provides typed methods for calling the API without exposing Axios details.
 */
export const apiClient = {
  /**
   * Performs an HTTP GET request.
   *
   * @template T Expected type of the response data.
   * @param url Relative route or endpoint.
   * @param config Additional request configuration.
   * @returns Data returned by the server.
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
   * Performs an HTTP POST request.
   *
   * @template T Expected type of the response data.
   * @param url Relative route or endpoint.
   * @param data Request body.
   * @param config Additional request configuration.
   * @returns Data returned by the server.
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
   * Performs an HTTP PUT request.
   *
   * @template T Expected type of the response data.
   * @param url Relative route or endpoint.
   * @param data Request body.
   * @param config Additional request configuration.
   * @returns Data returned by the server.
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
   * Performs an HTTP PATCH request.
   *
   * @template T Expected type of the response data.
   * @param url Relative route or endpoint.
   * @param data Request body.
   * @param config Additional request configuration.
   * @returns Data returned by the server.
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
   * Performs an HTTP DELETE request.
   *
   * @template T Expected type of the response data.
   * @param url Relative route or endpoint.
   * @param config Additional request configuration.
   * @returns Data returned by the server.
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
   * Performs an advanced request with the full Axios configuration.
   * Useful when response headers or HTTP metadata are needed.
   *
   * @template T Expected type of the response body.
   * @param config Full request configuration.
   * @returns Complete Axios response object.
   */
  async request<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    try {
      return await instance.request<T>(config);
    } catch (error) {
      throw normalizeError(error);
    }
  },
};
