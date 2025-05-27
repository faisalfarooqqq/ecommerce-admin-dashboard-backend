import { Router } from "express";
import { InventoryController } from "../controllers/inventoryController";

const router = Router();

router.get("/", InventoryController.getInventoryStatus);

export default router;
