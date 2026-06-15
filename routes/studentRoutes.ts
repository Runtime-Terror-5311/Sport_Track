import { Router } from "express";
import multer from "multer";
import { UserController } from "../controllers/userController";
import { StudentController } from "../controllers/studentController";
import { authMiddleware, adminMiddleware } from "../middleware/auth";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", authMiddleware, adminMiddleware, UserController.getStudents);
router.get("/by-room", authMiddleware, adminMiddleware, UserController.getStudentByRoom);
router.delete("/:id", authMiddleware, adminMiddleware, UserController.deleteStudent);
router.post("/", authMiddleware, adminMiddleware, StudentController.addStudent);
router.post("/import", authMiddleware, adminMiddleware, upload.single("file"), StudentController.importStudents);

export default router;
