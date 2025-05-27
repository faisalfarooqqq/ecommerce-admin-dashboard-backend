import { Router } from "express";
import { SalesController } from "../controllers/salesController";
import { validateQuery } from "../middleware/validation";
import { salesQuerySchema } from "../middleware/validation";

const router = Router();

router.get("/", validateQuery(salesQuerySchema), SalesController.getSales);
export default router;
