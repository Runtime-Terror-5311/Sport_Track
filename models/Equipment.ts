import { db, Equipment, isMongo, MongooseEquipmentModel } from "../config/db";

export class EquipmentModel {
  static async find(): Promise<Equipment[]> {
    if (isMongo) {
      const items = await MongooseEquipmentModel.find();
      return items.map(e => e.toObject() as Equipment);
    }
    return db.getEquipment();
  }

  static async findById(id: string): Promise<Equipment | null> {
    if (isMongo) {
      try {
        const item = await MongooseEquipmentModel.findById(id);
        return item ? (item.toObject() as Equipment) : null;
      } catch (err) {
        return null;
      }
    }
    const equipmentList = db.getEquipment();
    return equipmentList.find((e) => e.id === id) || null;
  }

  static async create(equipmentData: Omit<Equipment, "id">): Promise<Equipment> {
    if (isMongo) {
      const item = await MongooseEquipmentModel.create(equipmentData);
      return item.toObject() as Equipment;
    }
    const equipmentList = db.getEquipment();
    const newEquipment: Equipment = {
      ...equipmentData,
      id: "eq_" + Math.random().toString(36).substr(2, 9),
    };
    equipmentList.push(newEquipment);
    db.writeEquipment(equipmentList);
    return newEquipment;
  }

  static async findByIdAndUpdate(
    id: string,
    updates: Partial<Omit<Equipment, "id">>
  ): Promise<Equipment | null> {
    if (isMongo) {
      try {
        const item = await MongooseEquipmentModel.findByIdAndUpdate(id, updates, { new: true });
        return item ? (item.toObject() as Equipment) : null;
      } catch (err) {
        return null;
      }
    }
    const equipmentList = db.getEquipment();
    const index = equipmentList.findIndex((e) => e.id === id);
    if (index === -1) return null;

    equipmentList[index] = {
      ...equipmentList[index],
      ...updates,
    };
    db.writeEquipment(equipmentList);
    return equipmentList[index];
  }

  static async findByIdAndDelete(id: string): Promise<boolean> {
    if (isMongo) {
      try {
        const result = await MongooseEquipmentModel.findByIdAndDelete(id);
        return result !== null;
      } catch (err) {
        return false;
      }
    }
    const equipmentList = db.getEquipment();
    const filtered = equipmentList.filter((e) => e.id !== id);
    if (filtered.length === equipmentList.length) return false;
    db.writeEquipment(filtered);
    return true;
  }
}
