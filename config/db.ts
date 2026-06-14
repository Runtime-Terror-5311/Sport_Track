import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import mongoose, { Schema } from "mongoose";

const DATABASE_FILE = path.join(process.cwd(), "sports_tracker_db.json");

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  hostel: string;
  roomNumber: string;
  role: "student" | "admin";
  resetOTP?: string | null;
  otpExpiry?: string | null;
  phone?: string | null;
  regNo?: string | null;
}

export interface Equipment {
  id: string;
  name: string;
  totalQuantity: number;
  availableQuantity: number;
}

export interface Issue {
  id: string;
  studentId: string;
  equipmentId: string;
  quantity: number;
  issueDate: string; // ISO String
  dueDate: string;   // ISO String
  returnDate: string | null; // ISO String or null
  status: "Active" | "Overdue" | "Return Requested" | "Returned";
}

export interface DatabaseSchema {
  users: User[];
  equipment: Equipment[];
  issues: Issue[];
}

// --- Mongoose Setup ---
export let isMongo = false;

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  hostel: { type: String, default: "M" },
  roomNumber: { type: String, required: true, unique: true },
  role: { type: String, enum: ["student", "admin"], default: "student" },
  resetOTP: { type: String, default: null },
  otpExpiry: { type: Date, default: null },
  phone: { type: String, default: null },
  regNo: { type: String, required: true, unique: true },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret: any) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: (doc, ret: any) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

const EquipmentSchema = new Schema({
  name: { type: String, required: true, unique: true },
  totalQuantity: { type: Number, required: true, min: 0 },
  availableQuantity: { type: Number, required: true, min: 0 },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret: any) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: (doc, ret: any) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

const IssueSchema = new Schema({
  studentId: { type: String, required: true },
  equipmentId: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  issueDate: { type: Date, required: true, default: Date.now },
  dueDate: { type: Date, required: true },
  returnDate: { type: Date, default: null },
  status: { 
    type: String, 
    enum: ["Active", "Overdue", "Return Requested", "Returned"], 
    default: "Active" 
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret: any) => {
      ret.id = ret._id.toString();
      if (ret.issueDate) ret.issueDate = new Date(ret.issueDate).toISOString();
      if (ret.dueDate) ret.dueDate = new Date(ret.dueDate).toISOString();
      if (ret.returnDate) ret.returnDate = new Date(ret.returnDate).toISOString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: (doc, ret: any) => {
      ret.id = ret._id.toString();
      if (ret.issueDate) ret.issueDate = new Date(ret.issueDate).toISOString();
      if (ret.dueDate) ret.dueDate = new Date(ret.dueDate).toISOString();
      if (ret.returnDate) ret.returnDate = new Date(ret.returnDate).toISOString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

export const MongooseUserModel: mongoose.Model<any> = mongoose.models.User || mongoose.model("User", UserSchema);
export const MongooseEquipmentModel: mongoose.Model<any> = mongoose.models.Equipment || mongoose.model("Equipment", EquipmentSchema);
export const MongooseIssueModel: mongoose.Model<any> = mongoose.models.Issue || mongoose.model("Issue", IssueSchema);

export async function initDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log("ℹ️ MONGODB_URI environment variable not configured. Operating with high-performance local JSON DB.");
    return;
  }

  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(uri);
    isMongo = true;
    console.log("🚀 Custom MongoDB connected and active!");

    // Check if seeding is required
    const userCount = await MongooseUserModel.countDocuments();
    if (userCount === 0) {
      console.log("🌱 Database is empty! Auto-seeding initial student and secretary setup into MongoDB...");

      const salt = bcrypt.genSaltSync(10);
      const adminPasswordHash = bcrypt.hashSync("admin123", salt);
      const studentPasswordHash = bcrypt.hashSync("student123", salt);

      const admin = await MongooseUserModel.create({
        name: "Sports Secretary",
        email: "admin@sports.com",
        passwordHash: adminPasswordHash,
        hostel: "Admin Block",
        roomNumber: "ADMIN-101",
        role: "admin",
        regNo: "SECRETARY01",
        phone: "9876543212"
      });

      const student1 = await MongooseUserModel.create({
        name: "Shubhangi",
        email: "shubhangi0100@gmail.com",
        passwordHash: studentPasswordHash,
        hostel: "Ganga Hostel",
        roomNumber: "304",
        role: "student",
        regNo: "2026SH01",
        phone: "9876543210"
      });

      const student2 = await MongooseUserModel.create({
        name: "Rahul Sharma",
        email: "student@sports.com",
        passwordHash: studentPasswordHash,
        hostel: "Yamuna Hostel",
        roomNumber: "102",
        role: "student",
        regNo: "2026RS02",
        phone: "9876543211"
      });

      const eqFields = [
        { name: "Football", totalQuantity: 10, availableQuantity: 8 },
        { name: "Basketball", totalQuantity: 8, availableQuantity: 7 },
        { name: "Volleyball", totalQuantity: 6, availableQuantity: 6 },
        { name: "Cricket Bat", totalQuantity: 5, availableQuantity: 4 },
        { name: "Badminton Racket", totalQuantity: 12, availableQuantity: 11 },
      ];

      const createdEqs = await MongooseEquipmentModel.insertMany(eqFields as any);

      const fb = createdEqs.find((e: any) => e.name === "Football");
      const racket = createdEqs.find((e: any) => e.name === "Badminton Racket");
      const bat = createdEqs.find((e: any) => e.name === "Cricket Bat");

      const today = new Date();
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(today.getDate() - 10);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 7);

      await MongooseIssueModel.create([
        {
          studentId: student2._id.toString(),
          equipmentId: fb ? fb._id.toString() : "fake_fb_id",
          quantity: 1,
          issueDate: tenDaysAgo,
          dueDate: sevenDaysAgo,
          returnDate: null,
          status: "Overdue",
        },
        {
          studentId: student1._id.toString(),
          equipmentId: racket ? racket._id.toString() : "fake_racket_id",
          quantity: 1,
          issueDate: today,
          dueDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000),
          returnDate: null,
          status: "Active",
        },
        {
          studentId: student2._id.toString(),
          equipmentId: bat ? bat._id.toString() : "fake_bat_id",
          quantity: 1,
          issueDate: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
          dueDate: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000),
          returnDate: null,
          status: "Return Requested",
        }
      ]);
      console.log("🌱 MongoDB seeding finished perfectly!");
    }
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error);
    isMongo = false;
  }
}

// --- High-Performance Local JSON Fallback ---
class JsonDatabase {
  private data: DatabaseSchema = { users: [], equipment: [], issues: [] };

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DATABASE_FILE)) {
        const fileContent = fs.readFileSync(DATABASE_FILE, "utf-8");
        this.data = JSON.parse(fileContent);
        // Ensure collections exist
        if (!this.data.users) this.data.users = [];
        if (!this.data.equipment) this.data.equipment = [];
        if (!this.data.issues) this.data.issues = [];
      } else {
        this.seed();
      }
    } catch (error) {
      console.error("Error reading database file, using in-memory fallback", error);
      this.seed();
    }
  }

  private save() {
    try {
      fs.writeFileSync(DATABASE_FILE, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (error) {
      console.error("Error writing database file", error);
    }
  }

  private seed() {
    const salt = bcrypt.genSaltSync(10);
    const adminPasswordHash = bcrypt.hashSync("admin123", salt);
    const studentPasswordHash = bcrypt.hashSync("student123", salt);

    const userSeed: User[] = [
      {
        id: "usr_admin_1",
        name: "Sports Secretary",
        email: "admin@sports.com",
        passwordHash: adminPasswordHash,
        hostel: "Admin Block",
        roomNumber: "ADMIN-101",
        role: "admin",
        regNo: "SECRETARY01",
        phone: "9876543212"
      },
      {
        id: "usr_stud_1",
        name: "Shubhangi",
        email: "shubhangi0100@gmail.com",
        passwordHash: studentPasswordHash,
        hostel: "Ganga Hostel",
        roomNumber: "304",
        role: "student",
        regNo: "2026SH01",
        phone: "9876543210"
      },
      {
        id: "usr_stud_2",
        name: "Rahul Sharma",
        email: "student@sports.com",
        passwordHash: studentPasswordHash,
        hostel: "Yamuna Hostel",
        roomNumber: "102",
        role: "student",
        regNo: "2026RS02",
        phone: "9876543211"
      }
    ];

    const equipmentSeed: Equipment[] = [
      { id: "eq_1", name: "Football", totalQuantity: 10, availableQuantity: 8 },
      { id: "eq_2", name: "Basketball", totalQuantity: 8, availableQuantity: 7 },
      { id: "eq_3", name: "Volleyball", totalQuantity: 6, availableQuantity: 6 },
      { id: "eq_4", name: "Cricket Bat", totalQuantity: 5, availableQuantity: 4 },
      { id: "eq_5", name: "Badminton Racket", totalQuantity: 12, availableQuantity: 11 },
    ];

    const today = new Date();
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(today.getDate() - 10);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    const issuesSeed: Issue[] = [
      {
        id: "is_1",
        studentId: "usr_stud_2",
        equipmentId: "eq_1",
        quantity: 1,
        issueDate: tenDaysAgo.toISOString(),
        dueDate: sevenDaysAgo.toISOString(),
        returnDate: null,
        status: "Overdue",
      },
      {
        id: "is_2",
        studentId: "usr_stud_1",
        equipmentId: "eq_5",
        quantity: 1,
        issueDate: new Date().toISOString(),
        dueDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        returnDate: null,
        status: "Active",
      },
      {
        id: "is_3",
        studentId: "usr_stud_2",
        equipmentId: "eq_4",
        quantity: 1,
        issueDate: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        returnDate: null,
        status: "Return Requested",
      }
    ];

    this.data = {
      users: userSeed,
      equipment: equipmentSeed,
      issues: issuesSeed,
    };
    this.save();
  }

  public getUsers(): User[] {
    this.load();
    return this.data.users;
  }

  public getEquipment(): Equipment[] {
    this.load();
    return this.data.equipment;
  }

  public getIssues(): Issue[] {
    this.load();
    let changed = false;
    const now = new Date();
    this.data.issues = this.data.issues.map((issue) => {
      if (issue.status === "Active" && now > new Date(issue.dueDate)) {
        issue.status = "Overdue";
        changed = true;
      }
      return issue;
    });
    if (changed) {
      this.save();
    }
    return this.data.issues;
  }

  public writeUsers(users: User[]) {
    this.data.users = users;
    this.save();
  }

  public writeEquipment(equipment: Equipment[]) {
    this.data.equipment = equipment;
    this.save();
  }

  public writeIssues(issues: Issue[]) {
    this.data.issues = issues;
    this.save();
  }
}

export const db = new JsonDatabase();
