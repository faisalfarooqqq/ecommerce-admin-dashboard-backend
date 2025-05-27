import express, { Application } from "express";
import dotenv from "dotenv";
import pool from "./config/database";

dotenv.config();
const app: Application = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Start Server
const startServer = async () => {
  try {
    await pool.query("SELECT NOW()");
    console.log("Database connected successfully");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};
startServer();
export default app;
