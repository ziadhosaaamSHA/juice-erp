-- MVP schema for Juice Factory ERP/CRM
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Security
CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text
);

CREATE TABLE permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text
);

CREATE TABLE role_permissions (
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text UNIQUE,
  phone text UNIQUE,
  password_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_roles (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- Accounting
CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  type text NOT NULL, -- asset, liability, equity, revenue, expense
  parent_id uuid REFERENCES accounts(id),
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date date NOT NULL,
  description text,
  source_type text NOT NULL, -- sales_invoice, purchase_invoice, production, custody, opening
  source_id uuid,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id uuid NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id),
  debit numeric(14,2) NOT NULL DEFAULT 0,
  credit numeric(14,2) NOT NULL DEFAULT 0,
  line_note text
);

-- CRM
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  phone text,
  address text,
  credit_limit numeric(14,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  phone text,
  address text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Inventory
CREATE TABLE warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  is_vehicle boolean NOT NULL DEFAULT false
);

CREATE TABLE items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text UNIQUE NOT NULL,
  name text NOT NULL,
  type text NOT NULL, -- raw, finished
  unit text NOT NULL,
  min_stock numeric(14,3) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES items(id),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  movement_date timestamptz NOT NULL DEFAULT now(),
  qty numeric(14,3) NOT NULL,
  direction text NOT NULL, -- in, out, transfer
  source_type text NOT NULL,
  source_id uuid,
  batch_no text,
  expiry_date date,
  unit_cost numeric(14,4) NOT NULL DEFAULT 0
);

-- Production
CREATE TABLE production_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no text UNIQUE NOT NULL,
  production_date date NOT NULL,
  status text NOT NULL, -- planned, in_progress, done
  notes text
);

CREATE TABLE production_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id uuid NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id),
  qty_used numeric(14,3) NOT NULL,
  unit_cost numeric(14,4) NOT NULL DEFAULT 0
);

CREATE TABLE production_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id uuid NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id),
  qty_produced numeric(14,3) NOT NULL,
  unit_cost numeric(14,4) NOT NULL DEFAULT 0
);

-- Sales
CREATE TABLE sales_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id),
  invoice_date date NOT NULL,
  status text NOT NULL, -- draft, posted, paid
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  notes text
);

CREATE TABLE sales_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_invoice_id uuid NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  qty numeric(14,3) NOT NULL,
  unit_price numeric(14,4) NOT NULL,
  line_total numeric(14,2) NOT NULL
);

CREATE TABLE sales_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_no text UNIQUE NOT NULL,
  sales_invoice_id uuid REFERENCES sales_invoices(id),
  return_date date NOT NULL,
  total_amount numeric(14,2) NOT NULL DEFAULT 0
);

-- Purchases
CREATE TABLE purchase_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no text UNIQUE NOT NULL,
  supplier_id uuid REFERENCES suppliers(id),
  invoice_date date NOT NULL,
  status text NOT NULL, -- draft, posted, paid
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  notes text
);

CREATE TABLE purchase_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_invoice_id uuid NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  qty numeric(14,3) NOT NULL,
  unit_price numeric(14,4) NOT NULL,
  line_total numeric(14,2) NOT NULL
);

-- Distribution / Custody
CREATE TABLE vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  plate_no text UNIQUE NOT NULL,
  driver_name text,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE custody_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  movement_date timestamptz NOT NULL DEFAULT now(),
  item_id uuid NOT NULL REFERENCES items(id),
  qty numeric(14,3) NOT NULL,
  direction text NOT NULL, -- load, return, sold
  source_type text NOT NULL,
  source_id uuid
);

-- Alerts & Messages
CREATE TABLE alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL, -- low_stock, near_expiry, inactive_customer, credit_limit
  entity_type text NOT NULL,
  entity_id uuid,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE messages_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL, -- sms, whatsapp
  recipient text NOT NULL,
  body text NOT NULL,
  status text NOT NULL, -- queued, sent, failed
  provider_message_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Backup history
CREATE TABLE backup_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_date timestamptz NOT NULL DEFAULT now(),
  file_name text,
  size_mb numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed', -- completed, failed, running
  notes text,
  last_restored_at timestamptz,
  restore_count integer NOT NULL DEFAULT 0
);


-- Indexes
CREATE INDEX idx_inventory_movements_item ON inventory_movements(item_id);
CREATE INDEX idx_inventory_movements_wh ON inventory_movements(warehouse_id);
CREATE INDEX idx_journal_lines_entry ON journal_lines(journal_entry_id);
CREATE INDEX idx_sales_invoice_items_invoice ON sales_invoice_items(sales_invoice_id);
CREATE INDEX idx_purchase_invoice_items_invoice ON purchase_invoice_items(purchase_invoice_id);
