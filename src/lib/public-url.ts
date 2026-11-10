/**
 * Public origin used in emails, contract links, and check-in URLs.
 *
 * APP_PUBLIC_URL and NEXTAUTH_URL are read from the process environment, so a
 * Helm release can set them at runtime. NEXT_PUBLIC_APP_URL is inlined when
 * the container image is built and is only a fallback.
 */
export function publicAppUrl(): string {
  const raw =
    process.env.APP_PUBLIC_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    ''
  return raw.replace(/\/$/, '')
}
