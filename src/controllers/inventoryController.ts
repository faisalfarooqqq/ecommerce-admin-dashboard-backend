import { Request, Response } from "express";
import pool from "../config/database";

export class InventoryController {
  static async getInventoryStatus(req: Request, res: Response) {
    try {
      const { category, low_stock, limit = 100, offset = 0 } = req.query;

      let query = `
        SELECT 
          i.*,
          p.name as product_name,
          p.category,
          p.sku,
          p.price,
          CASE 
            WHEN i.available_stock <= i.reorder_level THEN true
            ELSE false
          END as is_low_stock
        FROM inventory i
        JOIN products p ON i.product_id = p.id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramCount = 0;

      if (category) {
        query += ` AND p.category = $${++paramCount}`;
        params.push(category);
      }

      if (low_stock === "true") {
        query += ` AND i.available_stock <= i.reorder_level`;
      }

      query += ` ORDER BY i.last_updated DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      // Get summary statistics
      const summaryQuery = `
        SELECT 
          COUNT(*) as total_products,
          COUNT(CASE WHEN i.available_stock <= i.reorder_level THEN 1 END) as low_stock_count,
          SUM(i.available_stock) as total_available_stock,
          AVG(i.available_stock) as avg_stock_level
        FROM inventory i
        JOIN products p ON i.product_id = p.id
        ${category ? "WHERE p.category = $1" : ""}
      `;

      const summaryResult = await pool.query(
        summaryQuery,
        category ? [category] : []
      );

      res.json({
        inventory: result.rows,
        summary: {
          total_products: parseInt(summaryResult.rows[0].total_products),
          low_stock_count: parseInt(summaryResult.rows[0].low_stock_count),
          total_available_stock: parseInt(
            summaryResult.rows[0].total_available_stock
          ),
          avg_stock_level: parseFloat(summaryResult.rows[0].avg_stock_level),
        },
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
      });
    } catch (error) {
      console.error("Error fetching inventory status:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
