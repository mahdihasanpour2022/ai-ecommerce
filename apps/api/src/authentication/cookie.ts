import type { IncomingMessage } from 'node:http';

export type CookieResult =
  | { readonly kind: 'missing' }
  | { readonly kind: 'invalid' }
  | { readonly kind: 'present'; readonly value: string };

export function readCookie(request: IncomingMessage, name: string): CookieResult {
  const header = request.headers.cookie;
  if (header === undefined) return { kind: 'missing' };
  const matches: string[] = [];
  for (const segment of header.split(';')) {
    const trimmed = segment.trim();
    const separator = trimmed.indexOf('=');
    if (separator < 1) continue;
    if (trimmed.slice(0, separator) === name) matches.push(trimmed.slice(separator + 1));
  }
  if (matches.length === 0) return { kind: 'missing' };
  const value = matches[0];
  if (matches.length !== 1 || value === undefined || value.length === 0) {
    return { kind: 'invalid' };
  }
  return { kind: 'present', value };
}
