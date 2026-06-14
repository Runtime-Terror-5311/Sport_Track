import { Request, Response } from "express";
import { EquipmentModel } from "../models/Equipment";

export class EquipmentController {
  static async getEquipment(req: Request, res: Response): Promise<void> {
    try {
      const equipment = await EquipmentModel.find();
      res.status(200).json(equipment);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch equipment inventory" });
    }
  }

  static async getEquipmentById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const item = await EquipmentModel.findById(id);
      if (!item) {
        res.status(404).json({ error: "Equipment not found" });
        return;
      }
      res.status(200).json(item);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch equipment details" });
    }
  }

  static async addEquipment(req: Request, res: Response): Promise<void> {
    const { name, totalQuantity } = req.body;

    if (!name || totalQuantity === undefined || totalQuantity < 0) {
      res.status(400).json({ error: "Valid equipment name and total quantity are required" });
      return;
    }

    try {
      const newEquipment = await EquipmentModel.create({
        name,
        totalQuantity: Number(totalQuantity),
        availableQuantity: Number(totalQuantity), // Initially, all added items are available
      });
      res.status(201).json(newEquipment);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to register new equipment" });
    }
  }

  static async editEquipment(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { name, totalQuantity, availableQuantity } = req.body;

    try {
      const item = await EquipmentModel.findById(id);
      if (!item) {
        res.status(404).json({ error: "Equipment not found" });
        return;
      }

      const updates: any = {};
      if (name !== undefined) updates.name = name;
      
      if (totalQuantity !== undefined) {
        const qtyDiff = Number(totalQuantity) - item.totalQuantity;
        updates.totalQuantity = Number(totalQuantity);
        
        // Logical available item calculation
        if (availableQuantity !== undefined) {
          updates.availableQuantity = Number(availableQuantity);
        } else {
          updates.availableQuantity = Math.max(0, item.availableQuantity + qtyDiff);
        }
      } else if (availableQuantity !== undefined) {
        updates.availableQuantity = Number(availableQuantity);
      }

      if (updates.availableQuantity !== undefined && updates.totalQuantity !== undefined) {
        if (updates.availableQuantity > updates.totalQuantity) {
          res.status(400).json({ error: "Available quantity cannot exceed total quantity" });
          return;
        }
      } else if (updates.availableQuantity !== undefined && updates.availableQuantity > item.totalQuantity) {
        res.status(400).json({ error: "Available quantity cannot exceed total quantity" });
        return;
      }

      const updatedItem = await EquipmentModel.findByIdAndUpdate(id, updates);
      res.status(200).json(updatedItem);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to update equipment details" });
    }
  }

  static async deleteEquipment(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const success = await EquipmentModel.findByIdAndDelete(id);
      if (!success) {
        res.status(404).json({ error: "Equipment not found or already deleted" });
        return;
      }
      res.status(200).json({ message: "Equipment record successfully deleted" });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to delete equipment record" });
    }
  }
}
