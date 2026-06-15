import { Router } from "express";
import { AIController } from "../controllers/aiController";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// Secure all AI routes with JWT authentication middleware
router.post("/chat", authMiddleware, AIController.chat);
router.get("/history", authMiddleware, AIController.getHistory);
router.delete("/history", authMiddleware, AIController.clearHistory);

export default router;
