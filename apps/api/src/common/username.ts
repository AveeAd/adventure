// Lowercase letters, digits, underscore; must start with a letter; 3-30
// chars total. Applies to both auto-generated usernames (see
// UsersService.generateUniqueUsername) and the one manual edit a user gets.
export const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,29}$/;

// Turns an arbitrary seed (Google display name, or an email local-part
// fallback) into a candidate that satisfies USERNAME_PATTERN, before the
// caller appends a collision-breaking suffix if needed.
export function sanitizeUsernameSeed(seed: string): string {
  let cleaned = seed
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20);
  if (!/^[a-z]/.test(cleaned)) {
    cleaned = `u${cleaned}`;
  }
  while (cleaned.length < 3) {
    cleaned += '0';
  }
  return cleaned;
}
