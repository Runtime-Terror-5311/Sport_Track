import { db, Issue, isMongo, MongooseIssueModel } from "../config/db";

export class IssueModel {
  static async find(): Promise<Issue[]> {
    if (isMongo) {
      try {
        const issuesList = await MongooseIssueModel.find();
        const now = new Date();
        
        // Dynamically update status to Overdue if needed and save
        const enrichedList = await Promise.all(
          issuesList.map(async (issue) => {
            if (issue.status === "Active" && now > new Date(issue.dueDate)) {
              issue.status = "Overdue";
              await issue.save();
            }
            return issue.toObject() as Issue;
          })
        );
        return enrichedList;
      } catch (err) {
        return [];
      }
    }
    return db.getIssues();
  }

  static async findById(id: string): Promise<Issue | null> {
    if (isMongo) {
      try {
        const issue = await MongooseIssueModel.findById(id);
        return issue ? (issue.toObject() as Issue) : null;
      } catch (err) {
        return null;
      }
    }
    const issues = db.getIssues();
    return issues.find((i) => i.id === id) || null;
  }

  static async findByStudentId(studentId: string): Promise<Issue[]> {
    if (isMongo) {
      try {
        const issuesList = await MongooseIssueModel.find({ studentId });
        const now = new Date();
        const enrichedList = await Promise.all(
          issuesList.map(async (issue) => {
            if (issue.status === "Active" && now > new Date(issue.dueDate)) {
              issue.status = "Overdue";
              await issue.save();
            }
            return issue.toObject() as Issue;
          })
        );
        return enrichedList;
      } catch (err) {
        return [];
      }
    }
    const issues = db.getIssues();
    return issues.filter((i) => i.studentId === studentId);
  }

  static async create(issueData: Omit<Issue, "id">): Promise<Issue> {
    if (isMongo) {
      const issue = await MongooseIssueModel.create(issueData);
      return issue.toObject() as Issue;
    }
    const issues = db.getIssues();
    const newIssue: Issue = {
      ...issueData,
      id: "is_" + Math.random().toString(36).substr(2, 9),
    };
    issues.push(newIssue);
    db.writeIssues(issues);
    return newIssue;
  }

  static async findByIdAndUpdate(
    id: string,
    updates: Partial<Omit<Issue, "id">>
  ): Promise<Issue | null> {
    if (isMongo) {
      try {
        const mongoUpdates: any = { ...updates };
        if (mongoUpdates.issueDate) mongoUpdates.issueDate = new Date(mongoUpdates.issueDate);
        if (mongoUpdates.dueDate) mongoUpdates.dueDate = new Date(mongoUpdates.dueDate);
        if (mongoUpdates.returnDate) mongoUpdates.returnDate = new Date(mongoUpdates.returnDate);
        
        const issue = await MongooseIssueModel.findByIdAndUpdate(id, mongoUpdates, { new: true });
        return issue ? (issue.toObject() as Issue) : null;
      } catch (err) {
        return null;
      }
    }
    const issues = db.getIssues();
    const index = issues.findIndex((i) => i.id === id);
    if (index === -1) return null;

    issues[index] = {
      ...issues[index],
      ...updates,
    };
    db.writeIssues(issues);
    return issues[index];
  }

  static async deleteMany(ids: string[]): Promise<boolean> {
    if (isMongo) {
      try {
        await MongooseIssueModel.deleteMany({ _id: { $in: ids } });
        return true;
      } catch (err) {
        console.error("Mongoose deleteIssues err:", err);
        return false;
      }
    }
    const issues = db.getIssues();
    const updatedIssues = issues.filter((i) => !ids.includes(i.id));
    db.writeIssues(updatedIssues);
    return true;
  }
}
