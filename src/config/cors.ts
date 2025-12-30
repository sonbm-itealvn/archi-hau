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

const defaultOrigins = ["http://localhost:5173", "http://localhost:5174", "https://dashboard.son1311.id.vn", "http://landingpage.son1311.id.vn","http://landingpage.archihau.edu.vn","http://dashboard.archihau.edu.vn"];
const envOrigins = parseOrigins(process.env.CORS_ORIGINS);

export const corsOptions: CorsOptions = {
  origin: envOrigins.length > 0 ? envOrigins : defaultOrigins,
  credentials: true,
};
