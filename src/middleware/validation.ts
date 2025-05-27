import Joi from "joi";
import { Request, Response, NextFunction } from "express";

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.query);
    if (error) {
      res.status(400).json({
        error: "Validation error",
        details: error.details.map((d) => d.message),
      });
      return;
    }
    next();
  };
};

export const validateBody = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: "Validation error",
        details: error.details.map((d) => d.message),
      });
      return;
    }
    next();
  };
};

export const salesQuerySchema = Joi.object({
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso(),
  product_id: Joi.number().integer().positive(),
  category: Joi.string(),
  platform: Joi.string().valid("amazon", "walmart"),
  period: Joi.string()
    .valid("daily", "weekly", "monthly", "yearly")
    .default("daily"),
  limit: Joi.number().integer().positive().max(1000).default(100),
  offset: Joi.number().integer().min(0).default(0),
});

export const inventoryUpdateSchema = Joi.object({
  product_id: Joi.number().integer().positive().required(),
  quantity_change: Joi.number().integer().required(),
  change_type: Joi.string()
    .valid("purchase", "adjustment", "return")
    .required(),
  reason: Joi.string().optional(),
});
