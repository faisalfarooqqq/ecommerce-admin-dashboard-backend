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
  // Get sales analytics by period
  static async getSalesAnalytics(req: Request, res: Response) {
    try {
      const {
        period = "daily",
        start_date,
        end_date,
        category,
        platform,
      } = req.query;

      let dateFormat: string;
      let dateGroup: string;

      switch (period) {
        case "daily":
          dateFormat = "YYYY-MM-DD";
          dateGroup = "DATE(sale_date)";
          break;
        case "weekly":
          dateFormat = "YYYY-WW";
          dateGroup = "DATE_TRUNC('week', sale_date)";
          break;
        case "monthly":
          dateFormat = "YYYY-MM";
          dateGroup = "DATE_TRUNC('month', sale_date)";
          break;
        case "yearly":
          dateFormat = "YYYY";
          dateGroup = "DATE_TRUNC('year', sale_date)";
          break;
        default:
          res.status(400).json({ error: "Invalid period" });
          return;
      }

      let query = `
        SELECT 
          ${dateGroup} as period,
          SUM(total_amount) as total_revenue,
          COUNT(*) as total_orders,
          AVG(total_amount) as average_order_value,
          SUM(quantity) as total_quantity
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
      if (category) {
        query += ` AND p.category = $${++paramCount}`;
        params.push(category);
      }
      if (platform) {
        query += ` AND s.platform = $${++paramCount}`;
        params.push(platform);
      }

      query += ` GROUP BY ${dateGroup} ORDER BY period DESC`;

      const result = await pool.query(query, params);

      const analytics = result.rows.map((row) => ({
        period: row.period,
        total_revenue: parseFloat(row.total_revenue),
        total_orders: parseInt(row.total_orders),
        average_order_value: parseFloat(row.average_order_value),
        total_quantity: parseInt(row.total_quantity),
      }));

      res.json({ analytics });
    } catch (error) {
      console.error("Error fetching sales analytics:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
  // Get sales by category
  static async getSalesByCategory(req: Request, res: Response) {
    try {
      const { start_date, end_date, platform } = req.query;

      let query = `
        SELECT 
          p.category,
          SUM(s.total_amount) as total_revenue,
          SUM(s.quantity) as total_quantity,
          COUNT(DISTINCT s.product_id) as product_count,
          COUNT(*) as order_count
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
      if (platform) {
        query += ` AND s.platform = $${++paramCount}`;
        params.push(platform);
      }

      query += ` GROUP BY p.category ORDER BY total_revenue DESC`;

      const result = await pool.query(query, params);

      const categorySales = result.rows.map((row) => ({
        category: row.category,
        total_revenue: parseFloat(row.total_revenue),
        total_quantity: parseInt(row.total_quantity),
        product_count: parseInt(row.product_count),
        order_count: parseInt(row.order_count),
      }));

      res.json({ category_sales: categorySales });
    } catch (error) {
      console.error("Error fetching category sales:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Get revenue comparison between periods
  static async getRevenueComparison(req: Request, res: Response) {
    try {
      const { period = "monthly", compare_periods = 2 } = req.query;

      let dateFormat: string;
      let interval: string;

      switch (period) {
        case "daily":
          interval = "day";
          break;
        case "weekly":
          interval = "week";
          break;
        case "monthly":
          interval = "month";
          break;
        case "yearly":
          interval = "year";
          break;
        default:
          res.status(400).json({ error: "Invalid period" });
          return;
      }

      const query = `
        WITH period_revenue AS (
          SELECT 
            DATE_TRUNC('${interval}', sale_date) as period,
            SUM(total_amount) as revenue
          FROM sales
          WHERE sale_date >= CURRENT_DATE - INTERVAL '${compare_periods} ${interval}'
          GROUP BY DATE_TRUNC('${interval}', sale_date)
          ORDER BY period DESC
        )
        SELECT 
          period,
          revenue,
          LAG(revenue) OVER (ORDER BY period) as previous_revenue,
          CASE 
            WHEN LAG(revenue) OVER (ORDER BY period) > 0 
            THEN ((revenue - LAG(revenue) OVER (ORDER BY period)) / LAG(revenue) OVER (ORDER BY period)) * 100
            ELSE 0
          END as growth_percentage
        FROM period_revenue
      `;

      const result = await pool.query(query);

      const comparison = result.rows.map((row) => ({
        period: row.period,
        revenue: parseFloat(row.revenue),
        previous_revenue: row.previous_revenue
          ? parseFloat(row.previous_revenue)
          : null,
        growth_percentage: row.growth_percentage
          ? parseFloat(row.growth_percentage)
          : null,
      }));

      res.json({ revenue_comparison: comparison });
    } catch (error) {
      console.error("Error fetching revenue comparison:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
