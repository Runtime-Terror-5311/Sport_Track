import { Router } from "express";
import { EquipmentController } from "../controllers/equipmentController";
import { authMiddleware, adminMiddleware } from "../middleware/auth";

const router = Router();

// Students and Admins can view equipment
router.get("/", authMiddleware, EquipmentController.getEquipment);
router.get("/:id", authMiddleware, EquipmentController.getEquipmentById);

// Admin-only operations
router.post("/", authMiddleware, adminMiddleware, EquipmentController.addEquipment);
router.put("/:id", authMiddleware, adminMiddleware, EquipmentController.editEquipment);
router.delete("/:id", authMiddleware, adminMiddleware, EquipmentController.deleteEquipment);

export default router;
