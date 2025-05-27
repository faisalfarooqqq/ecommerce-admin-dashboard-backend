import { Request, Response } from "express";
import pool from "../config/database";

export class ProductController {
  static async getProducts(req: Request, res: Response) {
    try {
      const { category, search, limit = 100, offset = 0 } = req.query;

      let query = `
        SELECT 
          p.*,
          i.current_stock,
          i.available_stock,
          i.reorder_level,
          CASE 
            WHEN i.available_stock <= i.reorder_level THEN true
            ELSE false
          END as is_low_stock
        FROM products p
        LEFT JOIN inventory i ON p.id = i.product_id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramCount = 0;

      if (category) {
        query += ` AND p.category = ${++paramCount}`;
        params.push(category);
      }
      if (search) {
        query += ` AND (p.name ILIKE ${++paramCount} OR p.description ILIKE ${paramCount} OR p.sku ILIKE ${paramCount})`;
        params.push(`%${search}%`);
      }

      query += ` ORDER BY p.created_at DESC LIMIT ${++paramCount} OFFSET ${++paramCount}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      res.json({
        products: result.rows,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
      });
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
