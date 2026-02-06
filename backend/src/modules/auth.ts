import { FastifyInstance } from "fastify";

export async function authRoutes(app: FastifyInstance) {
  app.post("/login", async () => ({ token: "demo-token" }));
  app.post("/logout", async () => ({ ok: true }));
  app.get("/me", async () => ({ id: "demo-user", role: "Admin" }));
}
