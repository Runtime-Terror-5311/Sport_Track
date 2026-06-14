import { Router } from "express";
import { UserController } from "../controllers/userController";

const router = Router();

router.post("/login", UserController.login);
router.post("/forgot-password", UserController.forgotPassword);
router.post("/verify-otp", UserController.verifyOtp);
router.post("/reset-password", UserController.resetPassword);

export default router;
