import { Router } from "express";
import { ProductController } from "../controllers/productController";
import Joi from "joi";
import { validateBody } from "../middleware/validation";

const router = Router();

const productCreateSchema = Joi.object({
  name: Joi.string().required().max(255),
  description: Joi.string().optional(),
  price: Joi.number().positive().required(),
  category: Joi.string().required().max(100),
  sku: Joi.string().required().max(100),
  initial_stock: Joi.number().integer().min(0).default(0),
  reorder_level: Joi.number().integer().min(0).default(10),
});

const productUpdateSchema = Joi.object({
  name: Joi.string().max(255),
  description: Joi.string().optional(),
  price: Joi.number().positive(),
  category: Joi.string().max(100),
});

router.get("/", ProductController.getProducts);
router.post(
  "/",
  validateBody(productCreateSchema),
  ProductController.createProduct
);
router.get("/categories", ProductController.getCategories);

router.get("/:id", ProductController.getProductById);
router.put(
  "/:id",
  validateBody(productUpdateSchema),
  ProductController.updateProduct
);

export default router;
