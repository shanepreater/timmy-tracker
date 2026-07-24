/**
 * Google emails are effectively case-insensitive; Postgres unique
 * constraints aren't. Every AllowedUser/AccessRequest email is stored
 * and compared via this, so "Shane@x.com" and "shane@x.com" are always
 * the same person. See docs/design-access-control.md.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
