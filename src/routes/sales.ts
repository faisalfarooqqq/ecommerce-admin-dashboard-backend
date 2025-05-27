import { Router } from "express";
import { SalesController } from "../controllers/salesController";
import { validateQuery } from "../middleware/validation";
import { salesQuerySchema } from "../middleware/validation";

const router = Router();

router.get("/", validateQuery(salesQuerySchema), SalesController.getSales);
router.get("/analytics", SalesController.getSalesAnalytics);
router.get("/by-category", SalesController.getSalesByCategory);
router.get("/revenue-comparison", SalesController.getRevenueComparison);
export default router;
