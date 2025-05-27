import { Request, Response } from "express";
import pool from "../config/database";

export class ProductController {
  // Get all products
  static async getProducts(req: Request, res: Response): Promise<void> {
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
        query += ` AND p.category = $${++paramCount}`;
        params.push(category);
      }
      if (search) {
        query += ` AND (p.name ILIKE $${++paramCount} OR p.description ILIKE $${paramCount} OR p.sku ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      query += ` ORDER BY p.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
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

  // Get product by ID
  static async getProductById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const query = `
        SELECT 
          p.*,
          i.current_stock,
          i.available_stock,
          i.reserved_stock,
          i.reorder_level,
          i.last_updated as inventory_last_updated,
          CASE 
            WHEN i.available_stock <= i.reorder_level THEN true
            ELSE false
          END as is_low_stock
        FROM products p
        LEFT JOIN inventory i ON p.id = i.product_id
        WHERE p.id = $1
      `;

      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Product not found" });
        return;
      }

      res.json({ product: result.rows[0] });
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
  // Create new product
  static async createProduct(req: Request, res: Response) {
    try {
      const {
        name,
        description,
        price,
        category,
        sku,
        initial_stock = 0,
        reorder_level = 10,
      } = req.body;

      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        // Check if SKU already exists
        const existingProduct = await client.query(
          "SELECT id FROM products WHERE sku = $1",
          [sku]
        );
        if (existingProduct.rows.length > 0) {
          res
            .status(400)
            .json({ error: "Product with this SKU already exists" });
          return;
        }

        // Create product
        const productResult = await client.query(
          "INSERT INTO products (name, description, price, category, sku) VALUES ($1, $2, $3, $4, $5) RETURNING *",
          [name, description, price, category, sku]
        );

        const product = productResult.rows[0];

        // Create initial inventory record
        await client.query(
          "INSERT INTO inventory (product_id, current_stock, reorder_level) VALUES ($1, $2, $3)",
          [product.id, initial_stock, reorder_level]
        );

        // Record initial stock in history if > 0
        if (initial_stock > 0) {
          await client.query(
            "INSERT INTO inventory_history (product_id, change_type, quantity_change, previous_stock, new_stock, reason) VALUES ($1, $2, $3, $4, $5, $6)",
            [
              product.id,
              "purchase",
              initial_stock,
              0,
              initial_stock,
              "Initial stock",
            ]
          );
        }

        await client.query("COMMIT");

        res.status(201).json({
          message: "Product created successfully",
          product: product,
        });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
  // Update product
  static async updateProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, description, price, category } = req.body;

      const result = await pool.query(
        "UPDATE products SET name = $1, description = $2, price = $3, category = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *",
        [name, description, price, category, id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Product not found" });
        return;
      }

      res.json({
        message: "Product updated successfully",
        product: result.rows[0],
      });
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Get product categories
  static async getCategories(req: Request, res: Response) {
    try {
      const query = `
        SELECT 
          category,
          COUNT(*) as product_count,
          AVG(price) as avg_price,
          SUM(COALESCE(i.current_stock, 0)) as total_stock
        FROM products p
        LEFT JOIN inventory i ON p.id = i.product_id
        GROUP BY category
        ORDER BY product_count DESC
      `;

      const result = await pool.query(query);

      res.json({
        categories: result.rows.map((row) => ({
          category: row.category,
          product_count: parseInt(row.product_count),
          avg_price: parseFloat(row.avg_price),
          total_stock: parseInt(row.total_stock),
        })),
      });
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
