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

  // Update inventory levels
  static async updateInventory(req: Request, res: Response) {
    try {
      const { product_id, quantity_change, change_type, reason } = req.body;

      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        // Get current inventory
        const currentInventoryResult = await client.query(
          "SELECT current_stock FROM inventory WHERE product_id = $1",
          [product_id]
        );

        if (currentInventoryResult.rows.length === 0) {
          res.status(404).json({ error: "Product not found in inventory" });
          return;
        }

        const currentStock = currentInventoryResult.rows[0].current_stock;
        const newStock = currentStock + quantity_change;

        if (newStock < 0) {
          res
            .status(400)
            .json({ error: "Insufficient stock for this operation" });
          return;
        }

        // Update inventory
        await client.query(
          "UPDATE inventory SET current_stock = $1, last_updated = CURRENT_TIMESTAMP WHERE product_id = $2",
          [newStock, product_id]
        );

        // Record in inventory history
        await client.query(
          "INSERT INTO inventory_history (product_id, change_type, quantity_change, previous_stock, new_stock, reason) VALUES ($1, $2, $3, $4, $5, $6)",
          [
            product_id,
            change_type,
            quantity_change,
            currentStock,
            newStock,
            reason,
          ]
        );

        await client.query("COMMIT");

        // Get updated inventory data
        const updatedResult = await client.query(
          `
          SELECT 
            i.*,
            p.name as product_name,
            p.sku,
            CASE 
              WHEN i.available_stock <= i.reorder_level THEN true
              ELSE false
            END as is_low_stock
          FROM inventory i
          JOIN products p ON i.product_id = p.id
          WHERE i.product_id = $1
        `,
          [product_id]
        );

        res.json({
          message: "Inventory updated successfully",
          inventory: updatedResult.rows[0],
        });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error updating inventory:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
  // Get inventory history
  static async getInventoryHistory(req: Request, res: Response) {
    try {
      const {
        product_id,
        change_type,
        start_date,
        end_date,
        limit = 100,
        offset = 0,
      } = req.query;

      let query = `
      SELECT
        ih.*,
        p.name as product_name,
        p.sku
      FROM inventory_history ih
      JOIN products p ON ih.product_id = p.id
      WHERE 1=1
    `;

      const params: any[] = [];
      let paramCount = 0;

      if (product_id) {
        query += ` AND ih.product_id = $${++paramCount}`;
        params.push(product_id);
      }

      if (change_type) {
        query += ` AND ih.change_type = $${++paramCount}`;
        params.push(change_type);
      }

      if (start_date) {
        query += ` AND ih.created_at >= $${++paramCount}`;
        params.push(start_date);
      }

      if (end_date) {
        query += ` AND ih.created_at <= $${++paramCount}`;
        params.push(end_date);
      }

      query += ` ORDER BY ih.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      res.json({
        history: result.rows,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
      });
    } catch (error) {
      console.error("Error fetching inventory history:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Get low stock alerts
  static async getLowStockAlerts(req: Request, res: Response) {
    try {
      const query = `
        SELECT 
          i.*,
          p.name as product_name,
          p.category,
          p.sku,
          p.price,
          (i.reorder_level - i.available_stock) as shortage_amount
        FROM inventory i
        JOIN products p ON i.product_id = p.id
        WHERE i.available_stock <= i.reorder_level
        ORDER BY shortage_amount DESC
      `;

      const result = await pool.query(query);

      res.json({
        low_stock_alerts: result.rows,
        alert_count: result.rows.length,
      });
    } catch (error) {
      console.error("Error fetching low stock alerts:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
