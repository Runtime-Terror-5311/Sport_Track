import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import * as XLSX from "xlsx";
import { UserModel } from "../models/User";

export class StudentController {
  static async importStudents(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      res.status(400).json({ error: "Please upload an Excel or CSV file" });
      return;
    }

    try {
      // Read Excel/CSV workbook from memory safely
      let workbook;
      try {
        workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      } catch (e: any) {
        try {
          // Fallback parsing as array or string if standard buffer fails
          workbook = XLSX.read(req.file.buffer);
        } catch (e2: any) {
          throw new Error(`Excel format unreadable. ${e.message || e}`);
        }
      }

      if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
        res.status(400).json({ error: "No worksheets found in the uploaded file" });
        return;
      }

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert sheet to JSON rows
      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (rawRows.length === 0) {
        res.status(400).json({ error: "The uploaded file has no data rows." });
        return;
      }

      // 1. Normalize row keys to clean UTF-8 BOM, zero-width spaces, and trim space from headers
      // Also map common variations/casings style-wise to exact key names.
      const normalizedRows = rawRows.map((row) => {
        const normalized: any = {};
        for (const key of Object.keys(row)) {
          // Deep BOM and zero-width spaces removal
          const cleanKey = key.replace(/[\uFEFF\u200B-\u200D\u200E\u200F]/g, "").trim();
          const val = row[key];
          
          const lowerKey = cleanKey.toLowerCase();
          if (lowerKey === "name") {
            normalized["name"] = val;
          } else if (lowerKey === "email") {
            normalized["email"] = val;
          } else if (lowerKey === "hostel") {
            normalized["hostel"] = val;
          } else if (lowerKey === "roomnumber" || lowerKey === "room_number" || lowerKey === "room number" || lowerKey === "room") {
            normalized["roomNumber"] = val;
          } else if (lowerKey === "phone" || lowerKey === "phone_number" || lowerKey === "phonenumber" || lowerKey === "phone number") {
            normalized["phone"] = val;
          } else if (lowerKey === "regno" || lowerKey === "registrationnumber" || lowerKey === "reg_no" || lowerKey === "registration number" || lowerKey === "reg no") {
            normalized["regNo"] = val;
          } else {
            normalized[cleanKey] = val;
          }
        }
        return normalized;
      });

      // 2. Validate existence of required columns: "name", "email", "hostel", "roomNumber"
      const sampleRow = normalizedRows[0];
      const requiredColumns = ["name", "email", "hostel", "roomNumber"];
      const missingColumns = requiredColumns.filter(col => !(col in sampleRow));

      if (missingColumns.length > 0) {
        res.status(400).json({
          error: `Invalid spreadsheet format. Missing required columns: ${missingColumns.join(", ")}. Please check your headers.`
        });
        return;
      }

      // Fetch all existing users from DB to validate true system uniqueness
      const allUsers = await UserModel.find();
      const existingEmails = new Set(allUsers.map((u) => u.email.toLowerCase().trim()));
      const existingRoomNumbers = new Set(allUsers.map((u) => u.roomNumber.toLowerCase().trim()));
      const existingRegNos = new Set(
        allUsers.map((u) => u.regNo?.toLowerCase().trim()).filter(Boolean)
      );

      // Track emails, rooms, and regNos processed inside this current uploaded file
      const batchEmails = new Set<string>();
      const batchRooms = new Set<string>();
      const batchRegNos = new Set<string>();

      // Summary statistics
      let totalRows = 0;
      let importedCount = 0;
      let duplicateCount = 0;
      let errorCount = 0;

      // Report list for the downloadable CSV error log
      interface ImportErrorReport {
        regNo: string;
        error: string;
      }
      const errorReports: ImportErrorReport[] = [];

      // Create pre-hashed default password
      const salt = bcrypt.genSaltSync(10);
      const defaultPasswordHash = bcrypt.hashSync("student123", salt);

      for (let i = 0; i < normalizedRows.length; i++) {
        totalRows++;
        const row = normalizedRows[i];
        const rowNumInSheet = i + 2; // offset by 2 (1-based index + header)

        const name = row.name ? String(row.name).trim() : "";
        const email = row.email ? String(row.email).toLowerCase().trim() : "";
        const hostel = row.hostel ? String(row.hostel).trim() : "M";
        const roomNumber = row.roomNumber ? String(row.roomNumber).trim() : "";
        const phone = row.phone ? String(row.phone).trim() : "";
        let regNo = row.regNo ? String(row.regNo).trim() : "";

        // Check required fields
        if (!name || !email || !roomNumber) {
          errorCount++;
          const missing = [];
          if (!name) missing.push("name");
          if (!email) missing.push("email");
          if (!roomNumber) missing.push("roomNumber");
          
          errorReports.push({
            regNo: regNo || `ROW-${rowNumInSheet}`,
            error: `Missing required fields: ${missing.join(", ")}`
          });
          continue;
        }

        // Email regex check
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          errorCount++;
          errorReports.push({
            regNo: regNo || `ROW-${rowNumInSheet}`,
            error: `Invalid email format: "${email}"`
          });
          continue;
        }

        // Generate clean fallback registration number if empty
        if (!regNo) {
          const emailPrefix = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "");
          const randomSuffix = Math.floor(1000 + Math.random() * 9000);
          regNo = `REG-${emailPrefix.toUpperCase()}-${randomSuffix}`;
        }

        const emailLower = email;
        const roomLower = roomNumber.toLowerCase();
        const regLower = regNo.toLowerCase();

        // 1. Email check: Existing in Mongo or inside same excel sheet
        if (existingEmails.has(emailLower) || batchEmails.has(emailLower)) {
          duplicateCount++;
          errorReports.push({
            regNo: regNo,
            error: `Email already exists in system: ${email}`
          });
          continue;
        }

        // 2. Room Uniqueness: Hostel M is single-occupancy; roomNumber MUST be unique system-wide
        if (existingRoomNumbers.has(roomLower) || batchRooms.has(roomLower)) {
          errorCount++;
          errorReports.push({
            regNo: regNo,
            error: `Room ${roomNumber} is already assigned to another student.`
          });
          continue;
        }

        // 3. RegNo check: Unique registration number
        if (existingRegNos.has(regLower) || batchRegNos.has(regLower)) {
          errorCount++;
          errorReports.push({
            regNo: regNo,
            error: `Registration number already exists: ${regNo}`
          });
          continue;
        }

        // Everything is clean; record validation passes, lock them in
        batchEmails.add(emailLower);
        batchRooms.add(roomLower);
        batchRegNos.add(regLower);

        try {
          await UserModel.create({
            name,
            email: emailLower,
            passwordHash: defaultPasswordHash,
            hostel,
            roomNumber,
            role: "student",
            phone: phone || null,
            regNo,
          });

          importedCount++;
        } catch (dbErr: any) {
          errorCount++;
          errorReports.push({
            regNo,
            error: `Database insertion error: ${dbErr.message || dbErr}`
          });
        }
      }

      // Generate errors report in CSV format
      let csvContent = "regNo,error\r\n";
      errorReports.forEach((report) => {
        const escapedError = report.error.replace(/"/g, '""');
        csvContent += `"${report.regNo}","${escapedError}"\r\n`;
      });

      res.status(200).json({
        summary: {
          totalRows,
          imported: importedCount,
          duplicates: duplicateCount,
          errors: errorCount
        },
        errorReportCsv: csvContent
      });

    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to process spreadsheet file." });
    }
  }
}
