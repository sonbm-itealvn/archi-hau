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

const defaultOrigins = ["http://localhost:5173"];
const envOrigins = parseOrigins(process.env.CORS_ORIGINS);

export const corsOptions: CorsOptions = {
  origin: envOrigins.length > 0 ? envOrigins : defaultOrigins,
  credentials: true,
};
