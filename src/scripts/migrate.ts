import pool from "../config/database";

const createTables = async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Products table
    await client.query(`
        CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        category VARCHAR(100) NOT NULL,
        sku VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
        `);

    // Sales table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id),
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        sale_date TIMESTAMP NOT NULL,
        platform VARCHAR(20) CHECK (platform IN ('amazon', 'walmart')),
        customer_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Inventory table
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        product_id INTEGER UNIQUE REFERENCES products(id),
        current_stock INTEGER NOT NULL DEFAULT 0,
        reserved_stock INTEGER NOT NULL DEFAULT 0,
        available_stock INTEGER GENERATED ALWAYS AS (current_stock - reserved_stock) STORED,
        reorder_level INTEGER NOT NULL DEFAULT 10,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Inventory history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_history (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id),
        change_type VARCHAR(20) CHECK (change_type IN ('purchase', 'sale', 'adjustment', 'return')),
        quantity_change INTEGER NOT NULL,
        previous_stock INTEGER NOT NULL,
        new_stock INTEGER NOT NULL,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date)"
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_sales_product ON sales(product_id)"
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_sales_platform ON sales(platform)"
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)"
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_inventory_stock ON inventory(current_stock)"
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_inventory_history_date ON inventory_history(created_at)"
    );

    // Create trigger to update inventory on sales
    await client.query(`
      CREATE OR REPLACE FUNCTION update_inventory_on_sale()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE inventory 
        SET current_stock = current_stock - NEW.quantity,
            last_updated = CURRENT_TIMESTAMP
        WHERE product_id = NEW.product_id;
        
        INSERT INTO inventory_history (product_id, change_type, quantity_change, previous_stock, new_stock, reason)
        SELECT 
          NEW.product_id,
          'sale',
          -NEW.quantity,
          current_stock + NEW.quantity,
          current_stock,
          'Sale transaction'
        FROM inventory WHERE product_id = NEW.product_id;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS trigger_update_inventory_on_sale ON sales;
      CREATE TRIGGER trigger_update_inventory_on_sale
        AFTER INSERT ON sales
        FOR EACH ROW
        EXECUTE FUNCTION update_inventory_on_sale();
    `);
    await client.query("COMMIT");
    console.log("Database tables created successfully");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating tables:", error);
    throw error;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  createTables()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default createTables;
