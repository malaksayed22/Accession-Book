import { routing } from "@/i18n/routing";

export function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}
export function isPublicApi(pathname: string): boolean {
  return pathname.startsWith("/api/auth/") || pathname === "/api/health";
}
export function isAssetPath(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/") ||
    /\.(png|jpg|jpeg|svg|ico|webp|glb|css|js|txt|woff2?)$/.test(pathname) ||
    pathname === "/opengraph-image"
  );
}
export function splitLocale(pathname: string): { locale: string | null; path: string } {
  const match = routing.locales.find((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (!match) return { locale: null, path: pathname };
  return { locale: match, path: pathname.slice(match.length + 1) || "/" };
}
export function isPublicPage(path: string): boolean {
  return path === "/" || path === "/login" || path.startsWith("/invite/");
}
