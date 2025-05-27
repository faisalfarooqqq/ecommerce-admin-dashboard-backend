export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  sku: string;
  created_at: Date;
  updated_at: Date;
}

export interface Sale {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_amount: number;
  sale_date: Date;
  platform: "amazon" | "walmart";
  customer_id?: string;
  created_at: Date;
}

export interface Inventory {
  id: number;
  product_id: number;
  current_stock: number;
  reserved_stock: number;
  available_stock: number;
  reorder_level: number;
  last_updated: Date;
}

export interface InventoryHistory {
  id: number;
  product_id: number;
  change_type: "purchase" | "sale" | "adjustment" | "return";
  quantity_change: number;
  previous_stock: number;
  new_stock: number;
  reason?: string;
  created_at: Date;
}

export interface SalesAnalytics {
  total_revenue: number;
  total_orders: number;
  average_order_value: number;
  period: string;
}

export interface CategorySales {
  category: string;
  total_revenue: number;
  total_quantity: number;
  product_count: number;
}
