import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { IssueModel } from "../models/Issue";
import { EquipmentModel } from "../models/Equipment";
import { UserModel } from "../models/User";
import { EmailService } from "../services/emailService";
import { ReportService } from "../services/reportService";

export class IssueController {
  // Student: Get my issued equipment (excluding Returned ones)
  static async getMyIssued(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const allIssues = await IssueModel.findByStudentId(req.user.id);
      // Filter out returned items; student only sees active, overdue, return requested
      const activeIssues = allIssues.filter((issue) => issue.status !== "Returned");

      // Join equipment names to the results
      const equipmentList = await EquipmentModel.find();
      const enrichedIssues = activeIssues.map((issue) => {
        const item = equipmentList.find((e) => {
          const eId = (e.id || (e as any)._id || "").toString();
          return eId === issue.equipmentId?.toString();
        });
        return {
          ...issue,
          equipmentName: item ? item.name : "Unknown Equipment",
        };
      });

      res.status(200).json(enrichedIssues);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch currently issued items" });
    }
  }

  // Student: Request a return
  static async requestReturn(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { id } = req.params; // Issue ID

    try {
      const issue = await IssueModel.findById(id);
      if (!issue) {
        res.status(404).json({ error: "Issue record not found" });
        return;
      }

      // Check if this issue is owned by the current student requesting
      if (issue.studentId !== req.user.id) {
        res.status(403).json({ error: "Access forbidden. That issue record is not yours." });
        return;
      }

      if (issue.status === "Returned") {
        res.status(400).json({ error: "Equipment is already returned" });
        return;
      }

      const equipment = await EquipmentModel.findById(issue.equipmentId);
      const eqName = equipment ? equipment.name : "Sports Equipment";

      const updated = await IssueModel.findByIdAndUpdate(id, { status: "Return Requested" });

      // Trigger Email Notification
      EmailService.sendReturnRequestedEmail(
        req.user.email,
        req.user.name,
        eqName,
        issue.quantity
      ).catch((err) => console.error("Return request email trigger warning:", err));

      res.status(200).json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to submit return request" });
    }
  }

  // Admin: Get all currently active issued equipment (status is Active, Overdue, or Return Requested)
  static async getActiveIssues(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const allIssues = await IssueModel.find();
      // Only return items with status of Active, Overdue, or Return Requested
      const activeIssues = allIssues.filter((issue) => issue.status !== "Returned");

      const equipmentList = await EquipmentModel.find();
      const studentsList = await UserModel.find();

      const enrichedIssues = activeIssues.map((issue) => {
        const item = equipmentList.find((e) => {
          const eId = (e.id || (e as any)._id || "").toString();
          return eId === issue.equipmentId?.toString();
        });
        const student = studentsList.find((u) => {
          const uId = (u.id || (u as any)._id || "").toString();
          return uId === issue.studentId?.toString();
        });
        return {
          ...issue,
          equipmentName: item ? item.name : "Unknown Equipment",
          studentName: student ? student.name : "Unknown Student",
          studentEmail: student ? student.email : "",
          hostel: student ? student.hostel : "",
          roomNumber: student ? student.roomNumber : "",
        };
      });

      res.status(200).json(enrichedIssues);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch issued items" });
    }
  }

  // Admin: Issue equipment to a student
  static async issueEquipment(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { studentId, equipmentId, quantity } = req.body;

    if (!studentId || !equipmentId || !quantity || Number(quantity) <= 0) {
      res.status(400).json({ error: "Student ID, Equipment ID, and positive quantity are required" });
      return;
    }

    try {
      // Validate that student exists
      const student = await UserModel.findById(studentId);
      if (!student || student.role !== "student") {
        res.status(400).json({ error: "Invalid student selected" });
        return;
      }

      // Validate that equipment exists & has enough available quantity
      const equipment = await EquipmentModel.findById(equipmentId);
      if (!equipment) {
        res.status(400).json({ error: "Invalid equipment selected" });
        return;
      }

      const qty = Number(quantity);
      if (equipment.availableQuantity < qty) {
        res.status(400).json({
          error: `Unavailable quantity. Only ${equipment.availableQuantity} of ${equipment.name} available.`,
        });
        return;
      }

      // Create check-out timeline
      const issueDate = new Date();
      // Issue Date + 3 days
      const dueDate = new Date();
      dueDate.setDate(issueDate.getDate() + 3);

      const newIssue = await IssueModel.create({
        studentId,
        equipmentId,
        quantity: qty,
        issueDate: issueDate.toISOString(),
        dueDate: dueDate.toISOString(),
        returnDate: null,
        status: "Active",
      });

      // Deduct equipment availability
      await EquipmentModel.findByIdAndUpdate(equipmentId, {
        availableQuantity: equipment.availableQuantity - qty,
      });

      // Dispatch Brevo Notification email asynchronously in background
      EmailService.sendCheckoutEmail(
        student.email,
        student.name,
        equipment.name,
        qty,
        dueDate.toISOString()
      ).catch((err) => console.error("Checkout email trigger warning:", err));

      res.status(201).json(newIssue);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to issue equipment" });
    }
  }

  // Admin: Confirm a student return
  static async confirmReturn(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params; // Issue id

    try {
      const issue = await IssueModel.findById(id);
      if (!issue) {
        res.status(404).json({ error: "Issue record not found" });
        return;
      }

      if (issue.status === "Returned") {
        res.status(400).json({ error: "Equipment was already returned" });
        return;
      }

      const equipment = await EquipmentModel.findById(issue.equipmentId);
      if (!equipment) {
        res.status(400).json({ error: "Associated equipment record not found" });
        return;
      }

      // Record return parameters
      const today = new Date();
      await IssueModel.findByIdAndUpdate(id, {
        status: "Returned",
        returnDate: today.toISOString(),
      });

      // Restore equipment item availability
      const restoredAvailability = Math.min(
        equipment.totalQuantity,
        equipment.availableQuantity + issue.quantity
      );
      await EquipmentModel.findByIdAndUpdate(issue.equipmentId, {
        availableQuantity: restoredAvailability,
      });

      // Dispatch Confirmation Receipt Email in background
      const student = await UserModel.findById(issue.studentId);
      if (student) {
        EmailService.sendReturnConfirmedEmail(
          student.email,
          student.name,
          equipment.name,
          issue.quantity
        ).catch((err) => console.error("Return confirmation email trigger warning:", err));
      }

      res.status(200).json({ message: "Equipment return confirmed successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to confirm return" });
    }
  }

  // Admin: Get Monthly Report Data
  static async getMonthlyReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { year, month } = req.query;
    if (!year || !month) {
      res.status(400).json({ error: "Year and month query parameters are required" });
      return;
    }

    try {
      const y = parseInt(year as string, 10);
      const m = parseInt(month as string, 10);
      const report = await ReportService.getMonthlyReportData(y, m);
      res.status(200).json(report);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to generate monthly report data" });
    }
  }

  // Admin: Manually trigger report emailing and completed issues purging
  static async dispatchAndPurgeReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { year, month, recipientEmail } = req.body;
    if (!year || !month) {
      res.status(400).json({ error: "Year and month payload fields are required" });
      return;
    }

    try {
      const y = parseInt(year, 10);
      const m = parseInt(month, 10);
      // default: shubhangi0100@gmail.com
      const targetEmail = recipientEmail || "shubhangi0100@gmail.com";

      const outcome = await ReportService.mailAndPurgeMonthlyReport(y, m, targetEmail);
      if (!outcome.success) {
        res.status(400).json({ error: outcome.message });
        return;
      }

      res.status(200).json(outcome);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to execute manual report dispatch & purge" });
    }
  }
}
