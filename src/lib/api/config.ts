/**
 * Centralized API configuration.
 * Handles resolving and validating the base URL for HTTP requests.
 */

/**
 * Gets and validates the SmartPlan API base URL from environment variables.
 *
 * @returns The sanitized base URL (without a trailing slash).
 * @throws {Error} If `NEXT_PUBLIC_API_URL` is not defined or has no valid content.
 */
export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;

  if (!url || url.trim() === '') {
    throw new Error(
      '[SmartPlan API] The NEXT_PUBLIC_API_URL environment variable is not set. ' +
        'Please define it in your .env.local file (see .env.example).'
    );
  }

  // Remove duplicate trailing slashes to keep concatenation consistent
  return url.trim().replace(/\/+$/, '');
}
