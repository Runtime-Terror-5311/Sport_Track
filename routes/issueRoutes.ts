import { Router } from "express";
import { IssueController } from "../controllers/issueController";
import { authMiddleware, adminMiddleware } from "../middleware/auth";

const router = Router();

// Student portals
router.get("/my", authMiddleware, IssueController.getMyIssued);
router.post("/my/:id/return", authMiddleware, IssueController.requestReturn);

// Admin operations
router.get("/active", authMiddleware, adminMiddleware, IssueController.getActiveIssues);
router.get("/report", authMiddleware, adminMiddleware, IssueController.getMonthlyReport);
router.post("/report/dispatch-purge", authMiddleware, adminMiddleware, IssueController.dispatchAndPurgeReport);
router.post("/issue", authMiddleware, adminMiddleware, IssueController.issueEquipment);
router.post("/return/:id/confirm", authMiddleware, adminMiddleware, IssueController.confirmReturn);

export default router;
