import { Request, Response } from "express";
import pool from "../config/database";

export class SalesController {
  // Get sales data with filtering
  static async getSales(req: Request, res: Response) {
    try {
      const {
        start_date,
        end_date,
        product_id,
        category,
        platform,
        limit = 100,
        offset = 0,
      } = req.query;

      let query = `
        SELECT s.*, p.name as product_name, p.category, p.sku
        FROM sales s
        JOIN products p ON s.product_id = p.id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramCount = 0;

      if (start_date) {
        query += ` AND s.sale_date >= $${++paramCount}`;
        params.push(start_date);
      }
      if (end_date) {
        query += ` AND s.sale_date <= $${++paramCount}`;
        params.push(end_date);
      }
      if (product_id) {
        query += ` AND s.product_id = $${++paramCount}`;
        params.push(product_id);
      }
      if (category) {
        query += ` AND p.category = $${++paramCount}`;
        params.push(category);
      }
      if (platform) {
        query += ` AND s.platform = $${++paramCount}`;
        params.push(platform);
      }

      query += ` ORDER BY s.sale_date DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      let countQuery = `
  SELECT COUNT(*) 
  FROM sales s
  JOIN products p ON s.product_id = p.id
  WHERE 1=1
`;
      const countParams: any[] = [];
      let countParamCount = 0;

      if (start_date) {
        countQuery += ` AND s.sale_date >= $${++countParamCount}`;
        countParams.push(start_date);
      }
      if (end_date) {
        countQuery += ` AND s.sale_date <= $${++countParamCount}`;
        countParams.push(end_date);
      }
      if (product_id) {
        countQuery += ` AND s.product_id = $${++countParamCount}`;
        countParams.push(product_id);
      }
      if (category) {
        countQuery += ` AND p.category = $${++countParamCount}`;
        countParams.push(category);
      }
      if (platform) {
        countQuery += ` AND s.platform = $${++countParamCount}`;
        countParams.push(platform);
      }

      const countResult = await pool.query(countQuery, countParams);
      const totalCount = parseInt(countResult.rows[0].count);

      res.json({
        sales: result.rows,
        pagination: {
          total: totalCount,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          has_more:
            totalCount > parseInt(offset as string) + parseInt(limit as string),
        },
      });
    } catch (error) {
      console.error("Error fetching sales:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
