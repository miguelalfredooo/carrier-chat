'use client';

/**
 * Generate a v4 UUID
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Validate UUID v4 format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Get or create a user ID for the current session.
 * Uses localStorage to persist across page reloads.
 * Generates a valid UUID v4 format.
 */
export function getUserId(): string {
  if (typeof window === 'undefined') {
    // Server-side: return a placeholder UUID
    return '00000000-0000-4000-8000-000000000000';
  }

  const storageKey = 'carrier_user_id';
  let userId = localStorage.getItem(storageKey);

  // Validate and regenerate if invalid
  if (!userId || !isValidUUID(userId)) {
    userId = generateUUID();
    localStorage.setItem(storageKey, userId);
  }

  return userId;
}

/**
 * Fetch wrapper that automatically adds x-user-id header
 */
export async function authenticatedFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const userId = getUserId();

  const headers = new Headers(options?.headers);
  headers.set('x-user-id', userId);

  return fetch(url, {
    ...options,
    headers,
  });
}
