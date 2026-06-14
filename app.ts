import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import studentRoutes from "./routes/studentRoutes";
import equipmentRoutes from "./routes/equipmentRoutes";
import issueRoutes from "./routes/issueRoutes";

const app = express();

// Enable CORS
app.use(cors());

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routing API endpoints
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/equipment", equipmentRoutes);
app.use("/api/issues", issueRoutes);

// Simple healthcheck
app.get("/api/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

// JSON global API error catcher
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Express Error Catch:", err);
  res.status(err.status || 500).json({
    error: err.message || "An unexpected server-side error occurred",
  });
});

export default app;
