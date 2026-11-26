import cors from "cors";
import config from "../../config";

export const corsMiddleware = cors({
  origin(origin, callback) {
    // No Origin header: Postman, curl, server-to-server. CORS is browser-only.
    if (!origin) return callback(null, true);

    if (config.corsOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Not in the allow-list: no CORS headers are sent, the browser blocks it.
    return callback(null, false);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  maxAge: 600,
  // credentials: true,  // enable only if you use cookies (P2 auth)
});
