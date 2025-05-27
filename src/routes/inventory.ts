import { Router } from "express";
import { InventoryController } from "../controllers/inventoryController";
import { validateBody, inventoryUpdateSchema } from "../middleware/validation";

const router = Router();

router.get("/", InventoryController.getInventoryStatus);
router.put(
  "/update",
  validateBody(inventoryUpdateSchema),
  InventoryController.updateInventory
);
router.get("/history", InventoryController.getInventoryHistory);
router.get("/low-stock-alerts", InventoryController.getLowStockAlerts);

export default router;
