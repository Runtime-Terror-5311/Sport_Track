import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/User";
import { IssueModel } from "../models/Issue";
import { EmailService } from "../services/emailService";

const JWT_SECRET = process.env.JWT_SECRET || "sports_issue_tracker_jwt_secret_key_2026";
const otpRequestTracker = new Map<string, number>();

export class UserController {
  static async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    try {
      const user = await UserModel.findOne({ email: email.toLowerCase() });
      if (!user) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const isMatch = bcrypt.compareSync(password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
        },
        JWT_SECRET,
        { expiresIn: "4d" }
      );

      res.status(200).json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          hostel: user.hostel,
          roomNumber: user.roomNumber,
          role: user.role,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Login failed" });
    }
  }

  static async getStudents(req: Request, res: Response): Promise<void> {
    try {
      const users = await UserModel.find();
      const students = users.filter((u) => u.role === "student");

      // Filter based on search queries
      const { search } = req.query;
      let filteredStudents = students;

      if (search && typeof search === "string") {
        const queryTerm = search.toLowerCase();
        filteredStudents = students.filter(
          (s) =>
            s.name.toLowerCase().includes(queryTerm) ||
            s.email.toLowerCase().includes(queryTerm)
        );
      }

      // Return clean student structures without passwords
      const cleanStudents = filteredStudents.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        hostel: s.hostel,
        roomNumber: s.roomNumber,
      }));

      res.status(200).json(cleanStudents);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch student directory" });
    }
  }

  static async getStudentByRoom(req: Request, res: Response): Promise<void> {
    const { roomNumber } = req.query;
    if (!roomNumber) {
      res.status(400).json({ error: "Room number is required" });
      return;
    }

    try {
      const roomStr = String(roomNumber).trim().toLowerCase();
      const users = await UserModel.find();
      const student = users.find(
        (u) => u.role === "student" && u.roomNumber.toLowerCase().trim() === roomStr
      );

      if (!student) {
        res.status(404).json({ error: `No student record found for room number: ${roomNumber}` });
        return;
      }

      res.status(200).json({
        id: student.id,
        name: student.name,
        email: student.email,
        hostel: student.hostel,
        roomNumber: student.roomNumber,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch student by room number" });
    }
  }

  static async deleteStudent(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      const user = await UserModel.findById(id);
      if (!user) {
        res.status(404).json({ error: "Student profile not found" });
        return;
      }

      // Check if student has outstanding issues / unreturned equipment
      const studentIssues = await IssueModel.findByStudentId(id);
      const activeOrOverdueIssues = studentIssues.filter(
        (issue) => issue.status === "Active" || issue.status === "Overdue" || issue.status === "Return Requested"
      );

      if (activeOrOverdueIssues.length > 0) {
        res.status(400).json({
          error: `Cannot delete student "${user.name}" because they have ${activeOrOverdueIssues.length} active or pending equipment loans. Please confirm their returns first!`
        });
        return;
      }

      const deleted = await UserModel.delete(id);
      if (!deleted) {
        res.status(500).json({ error: "Failed to delete student profile" });
        return;
      }

      res.status(200).json({ message: `Student profile "${user.name}" deleted successfully` });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to delete student profile" });
    }
  }

  static async forgotPassword(req: Request, res: Response): Promise<void> {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    try {
      const emailLower = email.trim().toLowerCase();

      // Limit OTP requests to prevent spam (60-second cool down per email input)
      const lastRequested = otpRequestTracker.get(emailLower);
      if (lastRequested && Date.now() - lastRequested < 60000) {
        res.status(429).json({ error: "Please wait 60 seconds before requesting another OTP." });
        return;
      }
      otpRequestTracker.set(emailLower, Date.now());

      const user = await UserModel.findOne({ email: emailLower });

      // If the email does not exist, do not reveal it in the system.
      // Simply return the generic response as requested to protect privacy.
      if (!user) {
        res.status(200).json({
          message: "If the account exists, an OTP has been sent to the registered email."
        });
        return;
      }

      // Generate secure 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Expiry time set to 10 minutes (10 * 60 * 1000 ms)
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

      // Save OTP to DB
      await UserModel.update(user.id, {
        resetOTP: otp,
        otpExpiry: otpExpiry.toISOString(),
      });

      console.log(`[AUTH] Password recovery requested. Email: ${user.email} | OTP: ${otp} (Valid for 10 minutes)`);

      // Dispatch OTP Email using Brevo API helper
      await EmailService.sendResetOtpEmail(user.email, user.name, otp);

      res.status(200).json({
        message: "If the account exists, an OTP has been sent to the registered email."
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Something went wrong. Please try again." });
    }
  }

  static async verifyOtp(req: Request, res: Response): Promise<void> {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({ error: "Email and OTP are required" });
      return;
    }

    try {
      const user = await UserModel.findOne({ email: email.trim().toLowerCase() });

      if (!user || !user.resetOTP || user.resetOTP !== otp.trim()) {
        res.status(400).json({ error: "Invalid or expired OTP" });
        return;
      }

      const expiry = user.otpExpiry ? new Date(user.otpExpiry) : null;
      if (!expiry || expiry.getTime() < Date.now()) {
        res.status(400).json({ error: "Invalid or expired OTP" });
        return;
      }

      res.status(200).json({ message: "OTP verified successfully. You may now reset your password." });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to verify OTP" });
    }
  }

  static async resetPassword(req: Request, res: Response): Promise<void> {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      res.status(400).json({ error: "Email, OTP, and new password are required" });
      return;
    }

    try {
      const user = await UserModel.findOne({ email: email.trim().toLowerCase() });

      if (!user || !user.resetOTP || user.resetOTP !== otp.trim()) {
        res.status(400).json({ error: "Invalid or expired OTP" });
        return;
      }

      const expiry = user.otpExpiry ? new Date(user.otpExpiry) : null;
      if (!expiry || expiry.getTime() < Date.now()) {
        res.status(400).json({ error: "Invalid or expired OTP" });
        return;
      }

      // Hash the new password using bcrypt
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(newPassword, salt);

      // Save new password and clear the OTP fields
      await UserModel.update(user.id, {
        passwordHash,
        resetOTP: null,
        otpExpiry: null,
      });

      res.status(200).json({ message: "Password reset successfully. You can now log in with your new password." });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to reset password" });
    }
  }
}
