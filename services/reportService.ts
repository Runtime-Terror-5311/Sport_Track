import PDFDocument from "pdfkit";
import { IssueModel } from "../models/Issue";
import { UserModel } from "../models/User";
import { EquipmentModel } from "../models/Equipment";
import { EmailService } from "./emailService";

export interface MonthlyReportItem {
  id: string;
  studentId: string;
  equipmentId: string;
  quantity: number;
  issueDate: string;
  dueDate: string;
  returnDate: string | null;
  status: string;
  studentName: string;
  studentEmail: string;
  hostel: string;
  roomNumber: string;
  equipmentName: string;
}

export interface MonthlyReportData {
  year: number;
  month: number;
  periodName: string;
  items: MonthlyReportItem[];
  totalIssued: number;
  totalReturned: number;
  totalActive: number;
}

export class ReportService {
  private static MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  static async getMonthlyReportData(year: number, month: number): Promise<MonthlyReportData> {
    const allIssues = await IssueModel.find();
    const studentsList = await UserModel.find();
    const equipmentList = await EquipmentModel.find();

    const belongsToMonth = (dateStr: string | null | undefined) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d.getFullYear() === year && (d.getMonth() + 1) === month;
    };

    // Filter to only include completed transactions (status is "Returned" and returned during this target month)
    const monthlyIssues = allIssues.filter(
      (issue) => issue.status === "Returned" && belongsToMonth(issue.returnDate)
    );

    const items: MonthlyReportItem[] = [];
    for (const issue of monthlyIssues) {
      // Find the corresponding student by ID
      const student = studentsList.find((s) => {
        const sId = (s.id || (s as any)._id || "").toString();
        return sId === issue.studentId?.toString();
      });
      // Skip orphaned logs of deleted users to prevent "Unknown Student" dummy-data rendering
      if (!student) continue;

      // Find the corresponding equipment by ID
      const equipment = equipmentList.find((e) => {
        const eId = (e.id || (e as any)._id || "").toString();
        return eId === issue.equipmentId?.toString();
      });
      if (!equipment) continue;

      items.push({
        ...issue,
        studentName: student.name,
        studentEmail: student.email,
        hostel: student.hostel,
        roomNumber: student.roomNumber,
        equipmentName: equipment.name,
      });
    }

    const totalIssued = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalReturned = items
      .filter((item) => item.status === "Returned")
      .reduce((sum, item) => sum + item.quantity, 0);
    const totalActive = items
      .filter((item) => item.status !== "Returned")
      .reduce((sum, item) => sum + item.quantity, 0);

    return {
      year,
      month,
      periodName: `${this.MONTHS[month - 1]} ${year}`,
      items,
      totalIssued,
      totalReturned,
      totalActive,
    };
  }

  static generatePdfBuffer(reportData: MonthlyReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40 });
      const buffers: Buffer[] = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      // Header Brand bar
      doc.rect(40, 40, doc.page.width - 80, 80).fill("#0f172a");
      
      // Branding Title inside bar
      doc.fillColor("#ffffff").fontSize(20).text("SPORTTRACK HOSTEL SPORTS", 60, 55, { stroke: false });
      doc.fillColor("#10b981").fontSize(10).text("MONTHLY TRANSACTION AUDIT TRAIL REPORT", 60, 80, { characterSpacing: 1.5 });
      doc.fillColor("#94a3b8").fontSize(10).text(`Generated On: ${new Date().toLocaleDateString()}`, 60, 95);

      doc.moveDown(4.5);

      // Period Header Section
      doc.fillColor("#0f172a").fontSize(14).text("Report Information", { underline: false });
      
      const infoY = doc.y;
      doc.fontSize(10).fillColor("#475569");
      doc.text(`Billing / Calendar Period: `, 40, infoY + 5);
      doc.fillColor("#0f172a").font("Helvetica-Bold").text(`${reportData.periodName}`, 160, infoY + 5).font("Helvetica");
      
      doc.fillColor("#475569");
      doc.text(`Total Transactions Logged: `, 40, infoY + 20);
      doc.fillColor("#0f172a").text(`${reportData.items.length}`, 160, infoY + 20);

      // Draw horizontal line
      doc.moveTo(40, infoY + 40).lineTo(doc.page.width - 40, infoY + 40).strokeColor("#cbd5e1").lineWidth(1).stroke();

      // Summary Cards Block
      const cardY = infoY + 55;
      const cardWidth = (doc.page.width - 90) / 2;

      // Card 1: Total Completed Actions
      doc.rect(40, cardY, cardWidth, 60).fill("#f8fafc").strokeColor("#e2e8f0").stroke();
      doc.fillColor("#475569").fontSize(8).text("TOTAL COMPLETED TRANSACTIONS", 50, cardY + 12);
      doc.fillColor("#2563eb").fontSize(18).text(String(reportData.items.length), 50, cardY + 26);

      // Card 2: Total Items Returned
      doc.rect(40 + cardWidth + 10, cardY, cardWidth, 60).fill("#f8fafc").strokeColor("#e2e8f0").stroke();
      doc.fillColor("#475569").fontSize(8).text("TOTAL QUANTITY RETURNED", 50 + cardWidth + 10, cardY + 12);
      doc.fillColor("#10b981").fontSize(18).text(String(reportData.totalReturned), 50 + cardWidth + 10, cardY + 26);

      // Transaction List Section
      doc.moveDown(7.5);
      doc.fillColor("#0f172a").fontSize(13).text("Transaction Journal Registry");
      doc.moveDown(0.5);

      // Table Headers
      let tableY = doc.y;
      doc.rect(40, tableY, doc.page.width - 80, 20).fill("#f1f5f9");
      doc.fontSize(8).fillColor("#475569");
      doc.text("STUDENT & DETAILS", 45, tableY + 6, { width: 150 });
      doc.text("EQUIPMENT", 200, tableY + 6, { width: 100 });
      doc.text("QTY", 310, tableY + 6, { width: 30, align: "center" });
      doc.text("LOAN TERM", 350, tableY + 6, { width: 90 });
      doc.text("RETURN STATUS", 450, tableY + 6, { width: 100 });

      tableY += 20;

      // Draw Items
      reportData.items.forEach((item, index) => {
        // Prevent page overflow
        if (tableY > 670) {
          doc.addPage();
          tableY = 40;
          
          doc.rect(40, tableY, doc.page.width - 80, 20).fill("#f1f5f9");
          doc.fontSize(8).fillColor("#475569");
          doc.text("STUDENT & DETAILS", 45, tableY + 6, { width: 150 });
          doc.text("EQUIPMENT", 200, tableY + 6, { width: 100 });
          doc.text("QTY", 310, tableY + 6, { width: 30, align: "center" });
          doc.text("LOAN TERM", 350, tableY + 6, { width: 90 });
          doc.text("RETURN STATUS", 450, tableY + 6, { width: 100 });
          
          tableY += 20;
        }

        // Zebra striping background
        if (index % 2 === 1) {
          doc.rect(40, tableY, doc.page.width - 80, 32).fill("#f8fafc");
        }

        doc.fontSize(8);
        
        // Student column
        doc.fillColor("#1e293b").fontSize(8).text(item.studentName, 45, tableY + 6, { width: 150 });
        doc.fillColor("#64748b").fontSize(6).text(`Room ${item.roomNumber}, ${item.hostel}`, 45, tableY + 16, { width: 150 });

        // Equipment column
        doc.fillColor("#1e293b").fontSize(8).text(item.equipmentName, 200, tableY + 11, { width: 100 });

        // Qty column
        doc.fillColor("#1e293b").fontSize(8).text(String(item.quantity), 310, tableY + 11, { width: 30, align: "center" });

        // Loan term column
        const issueFmt = new Date(item.issueDate).toLocaleDateString();
        doc.fillColor("#334155").fontSize(8).text(`Out: ${issueFmt}`, 350, tableY + 6, { width: 90 });
        const dueFmt = new Date(item.dueDate).toLocaleDateString();
        doc.fillColor("#64748b").fontSize(8).text(`Due: ${dueFmt}`, 350, tableY + 16, { width: 90 });

        // Status column
        if (item.status === "Returned") {
          const retFmt = item.returnDate ? new Date(item.returnDate).toLocaleDateString() : "";
          doc.fillColor("#059669").fontSize(8).text(`Returned`, 450, tableY + 6, { width: 100 });
          doc.fillColor("#64748b").fontSize(8).text(`Date: ${retFmt}`, 450, tableY + 16, { width: 100 });
        } else {
          const color = item.status === "Overdue" ? "#dc2626" : (item.status === "Return Requested" ? "#2563eb" : "#d97706");
          doc.fillColor(color).fontSize(8).text(item.status, 450, tableY + 11, { width: 100 });
        }

        // Draw horizontal subtle grid border
        doc.moveTo(40, tableY + 32).lineTo(doc.page.width - 40, tableY + 32).strokeColor("#f1f5f9").lineWidth(0.5).stroke();

        tableY += 32;
      });

      // Subtle Footer on current page
      const footerY = doc.page.height - 40;
      doc.moveTo(40, footerY - 10).lineTo(doc.page.width - 40, footerY - 10).strokeColor("#e2e8f0").stroke();
      doc.fontSize(7).fillColor("#94a3b8").text("SportTrack Registry Portal - Auto Audit Archive Service", 40, footerY, { align: "left" });
      doc.fontSize(7).fillColor("#94a3b8").text("Confidential Admin Record", doc.page.width - 150, footerY, { align: "right" });

      doc.end();
    });
  }

  static async mailAndPurgeMonthlyReport(
    year: number,
    month: number,
    adminEmail: string
  ): Promise<{ success: boolean; message: string; itemsCount: number; purgedCount: number }> {
    const reportData = await this.getMonthlyReportData(year, month);
    if (reportData.items.length === 0) {
      return {
        success: false,
        message: `No equipment issue/return logs exist for the period of ${reportData.periodName}.`,
        itemsCount: 0,
        purgedCount: 0,
      };
    }

    // Generate PDF Buffer
    const pdfBuffer = await this.generatePdfBuffer(reportData);

    // Send Mail via EmailService
    const sent = await EmailService.sendMonthlyReportEmail(adminEmail, reportData.periodName, pdfBuffer);
    if (!sent) {
      return {
        success: false,
        message: `Report was compiled, but mailing mechanism failed. Please check BREVO_API_KEY.`,
        itemsCount: reportData.items.length,
        purgedCount: 0,
      };
    }

    // Filter Returned issues of this month to delete
    // (Active and Overdue records remain so that accountability is NOT compromised)
    const returnedIssues = reportData.items.filter((item) => item.status === "Returned");
    const idsToDelete = returnedIssues.map((item) => item.id);

    let purgedCount = 0;
    if (idsToDelete.length > 0) {
      const deleted = await IssueModel.deleteMany(idsToDelete);
      if (deleted) {
        purgedCount = idsToDelete.length;
      }
    }

    return {
      success: true,
      message: `Report for ${reportData.periodName} successfully mailed to ${adminEmail}, and ${purgedCount} returned record(s) were cleaned from the active database!`,
      itemsCount: reportData.items.length,
      purgedCount,
    };
  }
}
