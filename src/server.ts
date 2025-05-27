import express, { Application } from "express";
import dotenv from "dotenv";
import pool from "./config/database";
import routes from "./routes";

dotenv.config();
const app: Application = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Routes
app.use("/api", routes);
// Start Server
const startServer = async () => {
  try {
    await pool.query("SELECT NOW()");
    console.log("Database connected successfully");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      console.log("\nAvailable endpoints:");
      console.log("- GET  /api/health");
      console.log("- GET  /api/inventory");
      console.log("- GET  /api/products");
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};
startServer();
export default app;
