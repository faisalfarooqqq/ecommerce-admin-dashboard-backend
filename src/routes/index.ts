import { Request, Response, Router } from "express";
import inventoryRoutes from "./inventory";
import salesRoutes from "./sales";

const router = Router();

router.use("/inventory", inventoryRoutes);
router.use("/products", inventoryRoutes);
router.use("/sales", salesRoutes);

// Health check endpoint
router.get("/health", (req: Request, res: Response) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

export default router;
