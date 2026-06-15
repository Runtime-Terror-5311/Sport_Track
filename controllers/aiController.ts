import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { AIChatModel } from "../models/AIChat";
import { generateSportsAnswer } from "../services/aiService";

export class AIController {
  /**
   * Process a sports query through Gemini API
   */
  static async chat(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { message } = req.body;
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: "User authentication required" });
      return;
    }

    // Reject empty queries
    if (!message || typeof message !== "string" || !message.trim()) {
      res.status(400).json({ error: "Message query cannot be empty" });
      return;
    }

    // Sanitize input (strip basic HTML tags to prevent injections)
    const sanitizedQuery = message.replace(/<[^>]*>/g, "").trim();
    if (!sanitizedQuery) {
      res.status(400).json({ error: "Message query contains invalid characters" });
      return;
    }

    try {
      // Get previous chats of the user to enforce daily 20 question limit
      const userHistory = await AIChatModel.findByUser(user.id);

      const startOfToday = new Date();
      startOfToday.setUTCHours(0, 0, 0, 0);

      // Count chats created today
      const todayCount = userHistory.filter(
        (chat) => new Date(chat.timestamp).getTime() >= startOfToday.getTime()
      ).length;

      if (todayCount >= 20) {
        res.status(429).json({
          error: "You have reached your daily limit of 20 questions. Please try again tomorrow.",
        });
        return;
      }

      // Generate response via Gemini
      const aiAnswer = await generateSportsAnswer(sanitizedQuery);

      // Store in AIChat
      const storedChat = await AIChatModel.create({
        userId: user.id,
        question: sanitizedQuery,
        answer: aiAnswer,
      });

      res.status(200).json({
        answer: aiAnswer,
        chat: storedChat,
      });
    } catch (error: any) {
      console.error("AI Controller Error:", error);
      res.status(500).json({
        error: error.message || "An error occurred while generating the response. Please verify the Gemini API key setup.",
      });
    }
  }

  /**
   * Get historical messages for the currently logged-in user
   */
  static async getHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: "User authentication required" });
      return;
    }

    try {
      const history = await AIChatModel.findByUser(user.id);
      res.status(200).json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to retrieve history" });
    }
  }

  /**
   * Clear historical chats for the currently logged-in user
   */
  static async clearHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: "User authentication required" });
      return;
    }

    try {
      await AIChatModel.clearUserHistory(user.id);
      res.status(200).json({ message: "Chat history cleared successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to clear history" });
    }
  }
}
