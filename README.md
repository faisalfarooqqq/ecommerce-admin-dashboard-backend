# E-commerce Admin API

A REST API for e-commerce admin dashboard built with TypeScript, Express.js, and PostgreSQL.

## Features

- **Sales Analytics**: Detailed sales reporting with filtering by date, product, category, and platform
- **Revenue Analysis**: Daily, weekly, monthly, and yearly revenue breakdowns with period comparisons
- **Inventory Management**: Real-time inventory tracking with low stock alerts
- **Product Management**: Full CRUD operations for products with category management
- **Demo Data**: Pre-populated with realistic Amazon/Walmart style products and sales data

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. **Clone and install dependencies**

```bash
npm install
```

2. **Setup PostgreSQL database**

```bash
# Create database
createdb ecommerce_admin

# Or using PostgreSQL CLI
psql -U postgres
CREATE DATABASE ecommerce_admin;
```

3. **Configure environment variables**

```bash
cp .env.example .env
```

Edit `.env` file:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/ecommerce_admin
PORT=3000
NODE_ENV=development
```

4. **Run database migrations**

```bash
npm run migrate
```

5. **Seed demo data**

```bash
npm run seed
```

6. **Start the server**

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

The API will be available at `http://localhost:3000`

## Database Schema

### Products Table

- `id` (Primary Key)
- `name` - Product name
- `description` - Product description
- `price` - Product price
- `category` - Product category
- `sku` - Unique product identifier
- `created_at`, `updated_at` - Timestamps

### Sales Table

- `id` (Primary Key)
- `product_id` (Foreign Key to products)
- `quantity` - Quantity sold
- `unit_price` - Price per unit at time of sale
- `total_amount` - Total sale amount
- `sale_date` - Date of sale
- `platform` - 'amazon' or 'walmart'
- `customer_id` - Customer identifier
- `created_at` - Record creation timestamp

### Inventory Table

- `id` (Primary Key)
- `product_id` (Foreign Key to products)
- `current_stock` - Current stock level
- `reserved_stock` - Reserved stock (not available)
- `available_stock` - Computed available stock
- `reorder_level` - Minimum stock threshold
- `last_updated` - Last update timestamp

### Inventory History Table

- `id` (Primary Key)
- `product_id` (Foreign Key to products)
- `change_type` - 'purchase', 'sale', 'adjustment', 'return'
- `quantity_change` - Change in quantity
- `previous_stock`, `new_stock` - Stock levels before/after
- `reason` - Reason for change
- `created_at` - Change timestamp

## API Documentation

### Base URL

```
http://localhost:3000/api
```

## Sales Endpoints

### GET /sales

Get sales data with filtering options.

**Query Parameters:**

- `start_date` (ISO date) - Filter sales from this date
- `end_date` (ISO date) - Filter sales until this date
- `product_id` (number) - Filter by specific product
- `category` (string) - Filter by product category
- `platform` (string) - Filter by platform ('amazon' or 'walmart')
- `limit` (number, default: 100) - Number of results per page
- `offset` (number, default: 0) - Results offset for pagination

**Example:**

```bash
GET /api/sales?start_date=2024-01-01&category=Electronics&limit=50
```

**Response:**

```json
{
  "sales": [
    {
      "id": 1,
      "product_id": 1,
      "quantity": 2,
      "unit_price": 999.99,
      "total_amount": 1999.98,
      "sale_date": "2024-05-27T10:30:00Z",
      "platform": "amazon",
      "customer_id": "CUST_ABC123",
      "product_name": "iPhone 15 Pro",
      "category": "Electronics",
      "sku": "APPL-IP15P-001"
    }
  ],
  "pagination": {
    "total": 1500,
    "limit": 50,
    "offset": 0,
    "has_more": true
  }
}
```

### GET /sales/analytics

Get sales analytics by time period.

**Query Parameters:**

- `period` (string) - 'daily', 'weekly', 'monthly', 'yearly' (default: 'daily')
- `start_date`, `end_date` - Date range filter
- `category` - Category filter
- `platform` - Platform filter

**Example:**

```bash
GET /api/sales/analytics?period=monthly&start_date=2024-01-01
```

**Response:**

```json
{
  "analytics": [
    {
      "period": "2024-05-01T00:00:00.000Z",
      "total_revenue": 45230.5,
      "total_orders": 127,
      "average_order_value": 356.15,
      "total_quantity": 245
    }
  ]
}
```

### GET /sales/by-category

Get sales breakdown by product category.

**Response:**

```json
{
  "category_sales": [
    {
      "category": "Electronics",
      "total_revenue": 125430.2,
      "total_quantity": 350,
      "product_count": 8,
      "order_count": 95
    }
  ]
}
```

### GET /sales/revenue-comparison

Compare revenue across time periods.

**Query Parameters:**

- `period` - Time period ('daily', 'weekly', 'monthly', 'yearly')
- `compare_periods` (number, default: 2) - Number of periods to compare

**Response:**

```json
{
  "revenue_comparison": [
    {
      "period": "2024-05-01T00:00:00.000Z",
      "revenue": 45230.5,
      "previous_revenue": 38750.25,
      "growth_percentage": 16.73
    }
  ]
}
```

## Inventory Endpoints

### GET /inventory

Get current inventory status.

**Query Parameters:**

- `category` - Filter by product category
- `low_stock` (boolean) - Show only low stock items
- `limit`, `offset` - Pagination

**Response:**

```json
{
  "inventory": [
    {
      "id": 1,
      "product_id": 1,
      "current_stock": 45,
      "reserved_stock": 5,
      "available_stock": 40,
      "reorder_level": 20,
      "last_updated": "2024-05-27T12:00:00Z",
      "product_name": "iPhone 15 Pro",
      "category": "Electronics",
      "sku": "APPL-IP15P-001",
      "price": 999.99,
      "is_low_stock": false
    }
  ],
  "summary": {
    "total_products": 15,
    "low_stock_count": 3,
    "total_available_stock": 2340,
    "avg_stock_level": 156.0
  }
}
```

### PUT /inventory/update

Update inventory levels.

**Request Body:**

```json
{
  "product_id": 1,
  "quantity_change": 50,
  "change_type": "purchase",
  "reason": "Received new shipment"
}
```

**Response:**

```json
{
  "message": "Inventory updated successfully",
  "inventory": {
    "id": 1,
    "product_id": 1,
    "current_stock": 95,
    "available_stock": 90,
    "is_low_stock": false
  }
}
```

### GET /inventory/history

Get inventory change history.

**Query Parameters:**

- `product_id` - Filter by product
- `change_type` - Filter by change type
- `start_date`, `end_date` - Date range

### GET /inventory/low-stock-alerts

Get products with low stock levels.

**Response:**

```json
{
  "low_stock_alerts": [
    {
      "product_name": "Nike Air Max 270",
      "category": "Footwear",
      "current_stock": 8,
      "reorder_level": 15,
      "shortage_amount": 7
    }
  ],
  "alert_count": 3
}
```

## Product Endpoints

### GET /products

Get all products with inventory info.

**Query Parameters:**

- `category` - Filter by category
- `search` - Search in name, description, or SKU
- `limit`, `offset` - Pagination

### POST /products

Create a new product.

**Request Body:**

```json
{
  "name": "New Product",
  "description": "Product description",
  "price": 299.99,
  "category": "Electronics",
  "sku": "NEW-PROD-001",
  "initial_stock": 100,
  "reorder_level": 20
}
```

### GET /products/:id

Get product by ID with inventory details.

### PUT /products/:id

Update product information.

### GET /products/categories

Get all product categories with statistics.

**Response:**

```json
{
  "categories": [
    {
      "category": "Electronics",
      "product_count": 8,
      "avg_price": 542.36,
      "total_stock": 890
    }
  ]
}
```

## Sample Demo Data

The seeded database includes:

- **15 products** across 5 categories (Electronics, Footwear, Home & Kitchen, Health & Fitness, Clothing)
- **~7,300 sales records** spanning the past year
- **Realistic inventory levels** with some low-stock scenarios
- **Platform distribution** between Amazon and Walmart sales

### Sample Products:

- iPhone 15 Pro ($999.99)
- Samsung Galaxy S24 ($899.99)
- MacBook Air M3 ($1,299.99)
- Nike Air Max 270 ($129.99)
- Instant Pot Duo 7-in-1 ($79.99)

## Performance Optimizations

- **Database Indexes**: Optimized queries with proper indexing on frequently accessed columns
- **Pagination**: All list endpoints support pagination to handle large datasets
- **Computed Columns**: Available stock calculated at database level
- **Query Optimization**: Efficient JOIN operations and aggregations
- **Connection Pooling**: PostgreSQL connection pooling for better performance

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error type",
  "message": "Detailed error message",
  "details": ["Validation errors if applicable"]
}
```

Common HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `500` - Internal Server Error

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run migrate` - Run database migrations
- `npm run seed` - Populate database with demo data

### Database Management

```bash
# Reset database
npm run migrate
npm run seed

# Connect to database
psql -d ecommerce_admin

# View tables
\dt

# Check sample data
SELECT COUNT(*) FROM sales;
SELECT COUNT(*) FROM products;
```
