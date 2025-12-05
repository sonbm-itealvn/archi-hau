import { CorsOptions } from "cors";

const parseOrigins = (value?: string): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const defaultOrigins = ["http://localhost:5173","https://undefined-cosmetic-pam-logged.trycloudflare.com","https://fitness-postposted-renew-punk.trycloudflare.com"];
const envOrigins = parseOrigins(process.env.CORS_ORIGINS);

export const corsOptions: CorsOptions = {
  origin: envOrigins.length > 0 ? envOrigins : defaultOrigins,
  credentials: true,
};
