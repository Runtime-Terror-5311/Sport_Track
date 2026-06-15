import fs from "fs";
import path from "path";
import mongoose, { Schema } from "mongoose";
import { isMongo } from "../config/db";

export interface AIChat {
  id: string;
  userId: string;
  question: string;
  answer: string;
  timestamp: string; // ISO String
}

const AIChatSchema = new Schema({
  userId: { type: String, required: true, index: true },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret: any) => {
      ret.id = ret._id.toString();
      if (ret.timestamp) ret.timestamp = new Date(ret.timestamp).toISOString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: (doc, ret: any) => {
      ret.id = ret._id.toString();
      if (ret.timestamp) ret.timestamp = new Date(ret.timestamp).toISOString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

export const MongooseAIChatModel: mongoose.Model<any> = mongoose.models.AIChat || mongoose.model("AIChat", AIChatSchema);

// JSON Fallback database storage for AIChat
const AIC_FILE = path.join(process.cwd(), "sports_tracker_ai_chats.json");

function getLocalAIChats(): AIChat[] {
  try {
    if (fs.existsSync(AIC_FILE)) {
      const content = fs.readFileSync(AIC_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("Error reading fallback AIChat file", error);
  }
  return [];
}

function writeLocalAIChats(chats: AIChat[]) {
  try {
    fs.writeFileSync(AIC_FILE, JSON.stringify(chats, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing fallback AIChat file", error);
  }
}

export class AIChatModel {
  static async findByUser(userId: string): Promise<AIChat[]> {
    if (isMongo) {
      try {
        const chats = await MongooseAIChatModel.find({ userId }).sort({ timestamp: -1 }).limit(20);
        return chats.map(c => c.toObject() as AIChat).reverse(); // chronological order
      } catch (err) {
        return [];
      }
    }
    const chats = getLocalAIChats();
    const userChats = chats.filter((c) => c.userId === userId);
    userChats.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const top20 = userChats.slice(0, 20);
    return top20.reverse();
  }

  static async create(chatData: Omit<AIChat, "id" | "timestamp">): Promise<AIChat> {
    const timestampStr = new Date().toISOString();
    if (isMongo) {
      const chat = await MongooseAIChatModel.create({
        ...chatData,
        timestamp: new Date()
      });
      try {
        const count = await MongooseAIChatModel.countDocuments({ userId: chatData.userId });
        if (count > 20) {
          const oldestChats = await MongooseAIChatModel.find({ userId: chatData.userId })
            .sort({ timestamp: 1 })
            .limit(count - 20);
          const idsToDelete = oldestChats.map(c => c._id);
          await MongooseAIChatModel.deleteMany({ _id: { $in: idsToDelete } });
        }
      } catch (cleanupErr) {
        console.error("Failed to clean up MongoDB chats history", cleanupErr);
      }
      return chat.toObject() as AIChat;
    }

    const chats = getLocalAIChats();
    const newChat: AIChat = {
      ...chatData,
      id: "aic_" + Math.random().toString(36).substr(2, 9),
      timestamp: timestampStr,
    };
    chats.push(newChat);

    const thisUserChats = chats.filter(c => c.userId === chatData.userId);
    if (thisUserChats.length > 20) {
      thisUserChats.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const toDeleteCount = thisUserChats.length - 20;
      const deletedIds = new Set(thisUserChats.slice(0, toDeleteCount).map(c => c.id));
      
      const filteredChats = chats.filter(c => !deletedIds.has(c.id));
      writeLocalAIChats(filteredChats);
    } else {
      writeLocalAIChats(chats);
    }

    return newChat;
  }

  static async clearUserHistory(userId: string): Promise<void> {
    if (isMongo) {
      try {
        await MongooseAIChatModel.deleteMany({ userId });
      } catch (err) {
        console.error("Error clearing user history from Mongo:", err);
      }
      return;
    }
    const chats = getLocalAIChats();
    const remainingChats = chats.filter(c => c.userId !== userId);
    writeLocalAIChats(remainingChats);
  }
}
