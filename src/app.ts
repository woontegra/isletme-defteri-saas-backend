import express from "express";
import cors from "cors";
import { isCorsOriginAllowed } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { authRouter } from "./modules/auth/auth.routes";
import { tenantRouter } from "./modules/tenants/tenant.routes";
import { apiV1Router } from "./routes/api-v1";

export const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      callback(null, isCorsOriginAllowed(origin));
    },
    credentials: true,
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/tenants", tenantRouter);
app.use("/api/v1", apiV1Router);

app.use(errorHandler);
