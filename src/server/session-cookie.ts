export const sessionCookieName = () => "mock_session";
export const sessionCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: false,
  path: "/",
  maxAge,
});
