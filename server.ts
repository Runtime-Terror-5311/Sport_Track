import app from "./app";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initDatabase } from "./config/db";
import { SchedulerService } from "./services/schedulerService";

const PORT = 3000;

async function startServer() {
  // Initialize Database (MongoDB / local JSON fallback)
  await initDatabase();

  // Start background auto-reporting monthly cron
  SchedulerService.start();

  // If in development, integrate the Vite dev-mode middleware
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with HMR disabled (by AI Studio layout)...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    // Mount Vite dev server middleware
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Critical server startup error:", error);
});
