import type { FastifyInstance } from "fastify";
import * as handlers from "./handlers.js";

export async function authRoutes(app: FastifyInstance) {
  app.get("/signup", handlers.signupPage);
  app.post("/signup", handlers.signup);
  app.post("/magic-link", handlers.requestMagicLink);
  app.get("/verify", handlers.verify);
  app.get("/google", handlers.googleAuth);
  app.get("/google/callback", handlers.googleCallback);
  app.get("/success", handlers.authSuccess);
}
