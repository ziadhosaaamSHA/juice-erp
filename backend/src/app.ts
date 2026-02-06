import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { authRoutes } from "./modules/auth.js";
import { accountingRoutes } from "./modules/accounting.js";
import { inventoryRoutes } from "./modules/inventory.js";
import { productionRoutes } from "./modules/production.js";
import { salesRoutes } from "./modules/sales.js";
import { purchasesRoutes } from "./modules/purchases.js";
import { crmRoutes } from "./modules/crm.js";
import { distributionRoutes } from "./modules/distribution.js";
import { alertsRoutes } from "./modules/alerts.js";
import { messagesRoutes } from "./modules/messages.js";
import { reportsRoutes } from "./modules/reports.js";
import { settingsRoutes } from "./modules/settings.js";
import { teamsRoutes } from "./modules/teams.js";
import { backupRoutes } from "./modules/backup.js";

const app = Fastify({
  logger: {
    transport: {
      target: "pino-pretty",
      options: { colorize: true }
    }
  }
});

await app.register(cors, {
  origin: true,
});
await app.register(multipart, {
  limits: { fileSize: 200 * 1024 * 1024 },
});

app.setErrorHandler((err, _req, reply) => {
  const e = err as any;
  const statusCode = e?.statusCode || 500;
  reply.status(statusCode).send({ message: e?.message || "Server error" });
});

app.get("/health", async () => ({ ok: true }));

app.register(authRoutes, { prefix: "/api/v1/auth" });
app.register(accountingRoutes, { prefix: "/api/v1/accounting" });
app.register(inventoryRoutes, { prefix: "/api/v1/inventory" });
app.register(productionRoutes, { prefix: "/api/v1/production" });
app.register(salesRoutes, { prefix: "/api/v1/sales" });
app.register(purchasesRoutes, { prefix: "/api/v1/purchases" });
app.register(crmRoutes, { prefix: "/api/v1/crm" });
app.register(distributionRoutes, { prefix: "/api/v1/distribution" });
app.register(alertsRoutes, { prefix: "/api/v1/alerts" });
app.register(messagesRoutes, { prefix: "/api/v1/messages" });
app.register(reportsRoutes, { prefix: "/api/v1/reports" });
app.register(settingsRoutes, { prefix: "/api/v1/settings" });
app.register(teamsRoutes, { prefix: "/api/v1/teams" });
app.register(backupRoutes, { prefix: "/api/v1/backup" });

const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || "0.0.0.0";

app.listen({ port, host }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
