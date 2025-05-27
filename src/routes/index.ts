import { Request, Response, Router } from "express";
import inventoryRoutes from "./inventory";

const router = Router();

router.use("/inventory", inventoryRoutes);

// Health check endpoint
router.get("/health", (req: Request, res: Response) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

export default router;
