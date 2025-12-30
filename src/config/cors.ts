import { CorsOptions } from "cors";

const parseOrigins = (value?: string): string[] => {
  if (!value) return [];

  return value
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);
};

// ✅ Default origins (khi không có env)
const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",

  // FE production
  "https://landingpage.archihau.edu.vn",
  "https://www.archihau.edu.vn",

  // dashboard / landing
  "https://dashboard.archihau.edu.vn",
  "https://landingpage.archihau.edu.vn",

  // old domains (nếu còn dùng)
  "https://dashboard.son1311.id.vn",
  "http://landingpage.son1311.id.vn",
];

// ✅ Lấy từ ENV (nếu có)
const envOrigins = parseOrigins(process.env.CORS_ORIGINS);

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // ✅ Cho phép server-to-server, curl, postman
    if (!origin) return callback(null, true);

    const allowedOrigins =
      envOrigins.length > 0 ? envOrigins : defaultOrigins;

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.error("❌ CORS blocked origin:", origin);
    return callback(new Error("Not allowed by CORS"));
  },

  credentials: true,

  // ✅ QUAN TRỌNG – fix lỗi preflight
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
  ],
};
