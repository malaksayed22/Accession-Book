import type { NextResponse } from "next/server";

export function generateNonce(): string {
  return btoa(crypto.randomUUID());
}
export function securityHeaders(_opts: {
  nonce: string;
  dev: boolean;
  https: boolean;
  pathname: string;
}): Record<string, string> & { "Content-Security-Policy": string } {
  return { "Content-Security-Policy": "" };
}
export function applySecurityHeaders(_response: NextResponse, _headers: Record<string, string>) {}
