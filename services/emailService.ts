export class EmailService {
  private static getSendConfig() {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL || "notifications@sporttrack.com";
    const senderName = process.env.BREVO_SENDER_NAME || "SportTrack Hostel Sports";
    return { apiKey, senderEmail, senderName };
  }

  public static async sendEmail(
    toEmail: string,
    toName: string,
    subject: string,
    htmlContent: string,
    attachments?: { content: string; name: string }[]
  ): Promise<boolean> {
    const { apiKey, senderEmail, senderName } = this.getSendConfig();

    if (!apiKey) {
      console.log(`\n============== MOCK EMAIL DISPATCHED ==============`);
      console.log(`TO: ${toName} <${toEmail}>`);
      console.log(`SUBJECT: ${subject}`);
      console.log(`SENDER: ${senderName} <${senderEmail}>`);
      if (attachments && attachments.length > 0) {
        console.log(`ATTACHMENTS: ${attachments.map(a => a.name).join(", ")} (${attachments[0].content.substring(0, 30)}... base64)`);
      }
      console.log(`CONTENT (MOCKED HTML):`);
      console.log(htmlContent.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().substring(0, 300) + "...");
      console.log(`====================================================\n`);
      return true;
    }

    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: toEmail, name: toName }],
          subject,
          htmlContent,
          attachment: attachments,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[Brevo API Notice] SMTP delivery status: ${response.status}. If this is an IP authorization error, please authorize the cloud container IP in your Brevo authorized_ips list. Payload: ${errorText}`);
        return false;
      }

      console.log(`📧 Brevo email successfully dispatched to ${toEmail}`);
      return true;
    } catch (error) {
      console.error("❌ Failed to send email via Brevo SMTP helper:", error);
      return false;
    }
  }

  static async sendCheckoutEmail(studentEmail: string, studentName: string, equipmentName: string, quantity: number, dueDate: string) {
    const formattedDate = new Date(dueDate).toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric"
    });
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f8fafc;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #2563eb; margin: 0;">SportTrack Registry</h2>
          <p style="color: #64748b; font-size: 14px; margin: 5px 0 0 0;">Hostel Sports Equipment Check-out</p>
        </div>
        <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #cbd5e1;">
          <p style="margin-top: 0;">Hi <strong>${studentName}</strong>,</p>
          <p>This is your official confirmation receipt that the following sports gear has been checked out to you:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background-color: #f1f5f9;">
              <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: left;">Equipment</th>
              <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: center;">Quantity</th>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #cbd5e1;"><strong>${equipmentName}</strong></td>
              <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center;">${quantity}</td>
            </tr>
          </table>
          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin-top: 20px; border-radius: 4px;">
            <p style="margin: 0; color: #b91c1c; font-size: 14px;">
              ⚠️ <strong>Return Deadline:</strong> Your hand-in is due on or before <strong>${formattedDate}</strong>.
            </p>
          </div>
        </div>
        <div style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
          <p>Please request a return online before turning in items to the sports room.</p>
          <p>&copy; 2026 SportTrack Hostel Sports Portal. All rights reserved.</p>
        </div>
      </div>
    `;
    await this.sendEmail(studentEmail, studentName, `🏀 Equipment Issue Confirmation: ${equipmentName}`, html);
  }

  static async sendReturnRequestedEmail(studentEmail: string, studentName: string, equipmentName: string, quantity: number) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f8fafc;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #2563eb; margin: 0;">SportTrack Registry</h2>
          <p style="color: #64748b; font-size: 14px; margin: 5px 0 0 0;">Return Hand-In Request Filed</p>
        </div>
        <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #cbd5e1;">
          <p style="margin-top: 0;">Hi <strong>${studentName}</strong>,</p>
          <p>You have submitted an online request to return the following sports item:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background-color: #f1f5f9;">
              <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: left;">Equipment</th>
              <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: center;">Quantity</th>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #cbd5e1;"><strong>${equipmentName}</strong></td>
              <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center;">${quantity}</td>
            </tr>
          </table>
          <p>Please hand in the physical equipment to the Sports Room at your earliest convenience. The Sports Secretary will confirm receipt and finalize your return on the portal.</p>
        </div>
        <div style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
          <p>&copy; 2026 SportTrack Hostel Sports Portal. All rights reserved.</p>
        </div>
      </div>
    `;
    await this.sendEmail(studentEmail, studentName, `🔄 Return Request Registered: ${equipmentName}`, html);
  }

  static async sendReturnConfirmedEmail(studentEmail: string, studentName: string, equipmentName: string, quantity: number) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f8fafc;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #10b981; margin: 0;">SportTrack Registry</h2>
          <p style="color: #64748b; font-size: 14px; margin: 5px 0 0 0;">Return Confirmed Successfully</p>
        </div>
        <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #cbd5e1;">
          <p style="margin-top: 0;">Hi <strong>${studentName}</strong>,</p>
          <p>This is to confirm that the Sports Secretary has received and verified the physical return of your checked-out equipment:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background-color: #f1f5f9;">
              <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: left;">Equipment</th>
              <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: center;">Quantity Checked In</th>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #cbd5e1;"><strong>${equipmentName}</strong></td>
              <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center;">${quantity}</td>
            </tr>
          </table>
          <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin-top: 20px; border-radius: 4px;">
            <p style="margin: 0; color: #047857; font-size: 14px;">
              ✅ Your hand-in is verified. There are no outstanding liabilities or overdue penalties on this record.
            </p>
          </div>
        </div>
        <div style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
          <p>Thank you for returning the hostel equipment on time!</p>
          <p>&copy; 2026 SportTrack Hostel Sports Portal. All rights reserved.</p>
        </div>
      </div>
    `;
    await this.sendEmail(studentEmail, studentName, `✅ Return Confirmed Receipt: ${equipmentName}`, html);
  }

  static async sendResetOtpEmail(studentEmail: string, studentName: string, otp: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f8fafc;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #2563eb; margin: 0;">Sports Equipment Management System</h2>
          <p style="color: #64748b; font-size: 14px; margin: 5px 0 0 0;">Password Reset Verification OTP</p>
        </div>
        <div style="background-color: #ffffff; padding: 25px; border-radius: 8px; border: 1px solid #cbd5e1; color: #1e293b; line-height: 1.6;">
          <p style="margin-top: 0; font-size: 15px;">Dear <strong>${studentName}</strong>,</p>
          <p style="font-size: 14px;">Your OTP for password reset is:</p>
          
          <div style="text-align: center; margin: 25px 0;">
            <span style="display: inline-block; background-color: #f1f5f9; border: 1px solid #cbd5e1; color: #2563eb; font-size: 28px; font-weight: bold; letter-spacing: 5px; padding: 12px 24px; border-radius: 8px; font-family: 'Courier New', Courier, monospace;">${otp}</span>
          </div>

          <p style="font-size: 14px;">This OTP is valid for 10 minutes.</p>
          <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">If you did not request this password reset, please ignore this email.</p>
        </div>
        <div style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
          <p>&copy; 2026 Sports Equipment Management System. All rights reserved.</p>
        </div>
      </div>
    `;
    await this.sendEmail(studentEmail, studentName, "Password Reset OTP", html);
  }

  static async sendMonthlyReportEmail(adminEmail: string, periodName: string, pdfBuffer: Buffer): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f8fafc;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #0f172a; margin: 0;">SportTrack System Admin</h2>
          <p style="color: #10b981; font-size: 14px; margin: 5px 0 0 0; font-weight: bold; letter-spacing: 2px;">MONTHLY ARCHIVE REPORT</p>
        </div>
        <div style="background-color: #ffffff; padding: 25px; border-radius: 8px; border: 1px solid #cbd5e1; color: #1e293b; line-height: 1.6;">
          <p style="margin-top: 0; font-size: 15px;">Dear <strong>Administrator</strong>,</p>
          <p style="font-size: 14px;">As requested, your monthly sports equipment transaction report for <strong>${periodName}</strong> has been compiled successfully.</p>
          <p style="font-size: 14px;">Please find the official audit trail PDF document attached to this email.</p>
          
          <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; font-size: 13px; margin: 20px 0; border-left: 4px solid #0f172a;">
            <strong>Database Purge Confirmation:</strong> Following your configuration, after sending this email, the returned transaction logs for this month have been archived and purged from the live database.
          </div>

          <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">This is an automated system task executed on the 1st of the month.</p>
        </div>
        <div style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
          <p>&copy; 2026 SportTrack Hostel Sports Portal. All rights reserved.</p>
        </div>
      </div>
    `;

    const base64Content = pdfBuffer.toString("base64");
    const filename = `SportTrack_Report_${periodName.replace(/\s+/g, "_")}.pdf`;

    return await this.sendEmail(
      adminEmail,
      "SportTrack Administrator",
      `📊 Monthly Sports Equipment Report: ${periodName}`,
      html,
      [{ content: base64Content, name: filename }]
    );
  }
}
