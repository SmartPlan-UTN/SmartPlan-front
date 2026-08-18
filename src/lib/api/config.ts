/**
 * Configuración de la API centralizada.
 * Administra la resolución y validación de la URL base para peticiones HTTP.
 */

/**
 * Obtiene y valida la URL base de la API de SmartPlan desde las variables de entorno.
 *
 * @returns La URL base sanitizada (sin barra al final).
 * @throws {Error} Si `NEXT_PUBLIC_API_URL` no está definida ni tiene contenido válido.
 */
export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;

  if (!url || url.trim() === '') {
    throw new Error(
      '[SmartPlan API] La variable de entorno NEXT_PUBLIC_API_URL no está configurada. ' +
        'Por favor, definila en tu archivo .env.local (ver .env.example).'
    );
  }

  // Elimina barras finales duplicadas para mantener consistencia en la concatenación
  return url.trim().replace(/\/+$/, '');
}
