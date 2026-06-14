import { db, User, isMongo, MongooseUserModel } from "../config/db";

export class UserModel {
  static async find(): Promise<User[]> {
    if (isMongo) {
      const users = await MongooseUserModel.find();
      return users.map(u => u.toObject() as User);
    }
    return db.getUsers();
  }

  static async findById(id: string): Promise<User | null> {
    if (isMongo) {
      try {
        const user = await MongooseUserModel.findById(id);
        return user ? (user.toObject() as User) : null;
      } catch (err) {
        return null;
      }
    }
    const users = db.getUsers();
    return users.find((u) => u.id === id) || null;
  }

  static async findOne(query: Partial<User>): Promise<User | null> {
    if (isMongo) {
      try {
        const mongoQuery: any = { ...query };
        if (mongoQuery.id) {
          mongoQuery._id = mongoQuery.id;
          delete mongoQuery.id;
        }
        const user = await MongooseUserModel.findOne(mongoQuery);
        return user ? (user.toObject() as User) : null;
      } catch (err) {
        return null;
      }
    }
    const users = db.getUsers();
    return (
      users.find((u) => {
        return Object.entries(query).every(([key, value]) => {
          return (u as any)[key] === value;
        });
      }) || null
    );
  }

  static async create(userData: Omit<User, "id">): Promise<User> {
    if (isMongo) {
      const user = await MongooseUserModel.create(userData);
      return user.toObject() as User;
    }
    const users = db.getUsers();
    const newUser: User = {
      ...userData,
      id: "usr_" + Math.random().toString(36).substr(2, 9),
    };
    users.push(newUser);
    db.writeUsers(users);
    return newUser;
  }

  static async update(id: string, updates: Partial<User>): Promise<User | null> {
    if (isMongo) {
      try {
        const user = await MongooseUserModel.findByIdAndUpdate(id, updates, { new: true });
        return user ? (user.toObject() as User) : null;
      } catch (err) {
        return null;
      }
    }
    const users = db.getUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    users[idx] = { ...users[idx], ...updates };
    db.writeUsers(users);
    return users[idx];
  }

  static async delete(id: string): Promise<boolean> {
    if (isMongo) {
      try {
        const result = await MongooseUserModel.findByIdAndDelete(id);
        return !!result;
      } catch (err) {
        return false;
      }
    }
    const users = db.getUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return false;
    users.splice(idx, 1);
    db.writeUsers(users);
    return true;
  }
}
