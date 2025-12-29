import dotenv from "dotenv";

dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

export const env = {
  port: parseInt(process.env.PORT || "4000", 10),
  mongoUri: required("MONGODB_URI"),
  jwtAccessSecret: required("JWT_ACCESS_SECRET"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET"),
  cookieSecure: process.env.COOKIE_SECURE === "true",
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost:5173",
  encryptionKey: Buffer.from(required("ENCRYPTION_KEY_BASE64"), "base64"),
  googleMapsApiKey: required("GOOGLE_MAPS_API_KEY")
};

export const accessTokenTtl = "15m";
export const refreshTokenTtl = "7d";
