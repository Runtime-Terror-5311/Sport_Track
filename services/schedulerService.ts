import fs from "fs";
import path from "path";
import { ReportService } from "./reportService";

const SCHEDULER_STATE_FILE = path.join(process.cwd(), "sports_tracker_scheduler.json");

export class SchedulerService {
  private static timer: NodeJS.Timeout | null = null;

  // Initialize and check status on startup
  static start() {
    console.log("⏰ Sports issue tracker scheduler service initialized and running...");
    
    // Perform an immediate check on boot, then run every 12 hours
    this.checkForAutoReport().catch((err) => {
      console.error("Error in automated monthly report scheduler check:", err);
    });

    // 12 hours check interval
    this.timer = setInterval(() => {
      this.checkForAutoReport().catch((err) => {
        console.error("Error in scheduled auto-report interval check:", err);
      });
    }, 12 * 60 * 60 * 1000);
  }

  static stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private static getSentPeriods(): string[] {
    try {
      if (fs.existsSync(SCHEDULER_STATE_FILE)) {
        const fileContent = fs.readFileSync(SCHEDULER_STATE_FILE, "utf-8");
        const parsed = JSON.parse(fileContent);
        return Array.isArray(parsed.sentPeriods) ? parsed.sentPeriods : [];
      }
    } catch (err) {
      console.error("Error reading scheduler state, starting fresh:", err);
    }
    return [];
  }

  private static saveSentPeriod(period: string) {
    try {
      const sentPeriods = this.getSentPeriods();
      if (!sentPeriods.includes(period)) {
        sentPeriods.push(period);
      }
      fs.writeFileSync(
        SCHEDULER_STATE_FILE,
        JSON.stringify({ sentPeriods, lastChecked: new Date().toISOString() }, null, 2),
        "utf-8"
      );
    } catch (err) {
      console.error("Error saving scheduler state:", err);
    }
  }

  // Auto-triggering report algorithm
  static async checkForAutoReport() {
    const now = new Date();
    const dayOfMonth = now.getDate();

    // We only trigger auto-archive on the 1st of the month
    if (dayOfMonth !== 1) {
      return;
    }

    // Determine the previous month
    let prevYear = now.getFullYear();
    let prevMonth = now.getMonth(); // Date Month is 0-indexed, which corresponds directly to the previous month's 1-indexed number! 
    // e.g. July is now.getMonth() === 6. So June (month 6) is the previous month.
    // If now.getMonth() is 0 (January), the previous month is December of previous year.
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }

    const periodStr = `${prevYear}-${String(prevMonth).padStart(2, "0")}`; // e.g. "2026-06"
    const sentPeriods = this.getSentPeriods();

    if (sentPeriods.includes(periodStr)) {
      console.log(`[AutoReport] Report for ${periodStr} was already dispatched previously.`);
      return;
    }

    console.log(`[AutoReport] 1st of the month detected. Triggering monthly PDF archive for period: ${periodStr}...`);
    
    // Default recipient specified by user: shubhangi0100@gmail.com
    const recipientEmail = process.env.BREVO_SENDER_EMAIL || "shubhangi0100@gmail.com";

    try {
      const result = await ReportService.mailAndPurgeMonthlyReport(prevYear, prevMonth, recipientEmail);
      if (result.success) {
        console.log(`[AutoReport] SUCCESS: ${result.message}`);
        this.saveSentPeriod(periodStr);
      } else {
        console.warn(`[AutoReport] WARNING: ${result.message}`);
      }
    } catch (error) {
      console.error(`[AutoReport] ERROR: Automated report generation failed unexpectedly:`, error);
    }
  }
}
