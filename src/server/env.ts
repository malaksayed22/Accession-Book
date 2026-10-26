// MOCK server layer: no database, no secrets. Data comes from src/features/*/ (mock queries).
export type Env = {
  NODE_ENV: "development" | "production" | "test";
  APP_URL: string;
  LAB_TIMEZONE: string;
  LAB_LICENSE_ID?: string;
  REQUIRE_ADMIN_MFA: boolean;
  REQUIRE_REAUTH: boolean;
  [key: string]: unknown;
};

export const env = (): Env => ({
  NODE_ENV: process.env.NODE_ENV === "production" ? "production" : "development",
  APP_URL: process.env.APP_URL ?? "http://localhost:3000",
  LAB_TIMEZONE: process.env.LAB_TIMEZONE ?? "America/Toronto",
  LAB_LICENSE_ID: "LIC-MOCK-0001",
  REQUIRE_ADMIN_MFA: false,
  REQUIRE_REAUTH: false,
});
