import pool from "../config/database";
import { startOfYear, subDays, subMonths, addDays } from "date-fns";

const seedData = async () => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Clear existing data
    await client.query("DELETE FROM inventory_history");
    await client.query("DELETE FROM sales");
    await client.query("DELETE FROM inventory");
    await client.query("DELETE FROM products");

    // Seed products
    const products = [
      {
        name: "iPhone 15 Pro",
        description: "Latest Apple smartphone",
        price: 999.99,
        category: "Electronics",
        sku: "APPL-IP15P-001",
      },
      {
        name: "Samsung Galaxy S24",
        description: "Android flagship phone",
        price: 899.99,
        category: "Electronics",
        sku: "SAMS-GS24-001",
      },
      {
        name: "MacBook Air M3",
        description: "Apple laptop with M3 chip",
        price: 1299.99,
        category: "Electronics",
        sku: "APPL-MBA-M3",
      },
      {
        name: "Dell XPS 13",
        description: "Premium Windows laptop",
        price: 1099.99,
        category: "Electronics",
        sku: "DELL-XPS13-001",
      },
      {
        name: "Sony WH-1000XM5",
        description: "Noise canceling headphones",
        price: 399.99,
        category: "Electronics",
        sku: "SONY-WH1000XM5",
      },
      {
        name: "Nike Air Max 270",
        description: "Popular running shoes",
        price: 129.99,
        category: "Footwear",
        sku: "NIKE-AM270-001",
      },
      {
        name: "Adidas Ultraboost 22",
        description: "Premium running shoes",
        price: 179.99,
        category: "Footwear",
        sku: "ADID-UB22-001",
      },
      {
        name: "Instant Pot Duo 7-in-1",
        description: "Multi-use pressure cooker",
        price: 79.99,
        category: "Home & Kitchen",
        sku: "INST-DUO7-001",
      },
      {
        name: "Ninja Foodi Air Fryer",
        description: "Air fryer and pressure cooker",
        price: 199.99,
        category: "Home & Kitchen",
        sku: "NINJ-FOODI-001",
      },
      {
        name: "Fitbit Charge 5",
        description: "Advanced fitness tracker",
        price: 149.99,
        category: "Health & Fitness",
        sku: "FITB-CHG5-001",
      },
      {
        name: "Apple Watch Series 9",
        description: "Latest Apple smartwatch",
        price: 399.99,
        category: "Health & Fitness",
        sku: "APPL-AW9-001",
      },
      {
        name: "Levi's 501 Original Jeans",
        description: "Classic denim jeans",
        price: 59.99,
        category: "Clothing",
        sku: "LEVI-501-001",
      },
      {
        name: "Champion Powerblend Hoodie",
        description: "Comfortable cotton hoodie",
        price: 39.99,
        category: "Clothing",
        sku: "CHAMP-PB-HOOD",
      },
      {
        name: "Kindle Paperwhite",
        description: "Waterproof e-reader",
        price: 139.99,
        category: "Electronics",
        sku: "AMZN-KPW-001",
      },
      {
        name: "Echo Dot (5th Gen)",
        description: "Smart speaker with Alexa",
        price: 49.99,
        category: "Electronics",
        sku: "AMZN-ECHO-DOT5",
      },
    ];

    const productInserts = await Promise.all(
      products.map(async (product) => {
        const result = await client.query(
          "INSERT INTO products (name, description, price, category, sku) VALUES ($1, $2, $3, $4, $5) RETURNING id",
          [
            product.name,
            product.description,
            product.price,
            product.category,
            product.sku,
          ]
        );
        return result.rows[0].id;
      })
    );

    // Seed inventory
    const inventoryData = productInserts.map((productId, index) => ({
      product_id: productId,
      current_stock: Math.floor(Math.random() * 500) + 50,
      reserved_stock: Math.floor(Math.random() * 20),
      reorder_level: Math.floor(Math.random() * 50) + 10,
    }));

    await Promise.all(
      inventoryData.map(async (inv) => {
        await client.query(
          "INSERT INTO inventory (product_id, current_stock, reserved_stock, reorder_level) VALUES ($1, $2, $3, $4)",
          [
            inv.product_id,
            inv.current_stock,
            inv.reserved_stock,
            inv.reorder_level,
          ]
        );
      })
    );

    // Generate sales data for the past year
    const platforms = ["amazon", "walmart"];
    const startDate = startOfYear(new Date());
    const salesData = [];

    for (let i = 0; i < 365; i++) {
      const currentDate = addDays(startDate, i);
      const dailySales = Math.floor(Math.random() * 20) + 5;

      for (let j = 0; j < dailySales; j++) {
        const productId =
          productInserts[Math.floor(Math.random() * productInserts.length)];
        const quantity = Math.floor(Math.random() * 5) + 1;
        const product = products.find(
          (_, idx) => productInserts[idx] === productId
        );
        const unitPrice = product ? product.price : 100;
        const totalAmount = quantity * unitPrice;
        const platform =
          platforms[Math.floor(Math.random() * platforms.length)];

        salesData.push({
          product_id: productId,
          quantity,
          unit_price: unitPrice,
          total_amount: totalAmount,
          sale_date: currentDate,
          platform,
          customer_id: `CUST_${Math.random().toString(36).substr(2, 9)}`,
        });
      }
    }

    // Insert sales data in batches
    const batchSize = 100;
    for (let i = 0; i < salesData.length; i += batchSize) {
      const batch = salesData.slice(i, i + batchSize);
      const values = batch
        .map(
          (sale, index) =>
            `($${index * 7 + 1}, $${index * 7 + 2}, $${index * 7 + 3}, $${
              index * 7 + 4
            }, $${index * 7 + 5}, $${index * 7 + 6}, $${index * 7 + 7})`
        )
        .join(", ");

      const params = batch.flatMap((sale) => [
        sale.product_id,
        sale.quantity,
        sale.unit_price,
        sale.total_amount,
        sale.sale_date,
        sale.platform,
        sale.customer_id,
      ]);

      await client.query(
        `
        INSERT INTO sales (product_id, quantity, unit_price, total_amount, sale_date, platform, customer_id)
        VALUES ${values}
      `,
        params
      );
    }

    await client.query("COMMIT");
    console.log("Demo data seeded successfully");
    console.log(`- ${products.length} products`);
    console.log(`- ${salesData.length} sales records`);
    console.log(`- ${inventoryData.length} inventory records`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error seeding data:", error);
    throw error;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  seedData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default seedData;
