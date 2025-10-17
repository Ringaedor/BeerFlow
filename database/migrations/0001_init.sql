-- Abilitare estensione per UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Venues
CREATE TABLE venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Users
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES venues(id) ON DELETE SET NULL,
  email varchar(255) UNIQUE NOT NULL,
  password_hash varchar(255) NOT NULL,
  name varchar(255),
  role varchar(50),
  permissions jsonb DEFAULT '{}'::jsonb,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Products
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES venues(id),
  sku varchar(100),
  name varchar(255) NOT NULL,
  unit varchar(50),
  cost numeric(12,4),
  price numeric(12,4),
  attributes jsonb DEFAULT '{}'::jsonb,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_products_venue ON products(venue_id);

-- Lots
CREATE TABLE lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  lot_code varchar(200),
  supplier_id uuid,
  received_at timestamptz,
  expiry_date date,
  qty_init numeric(12,4) DEFAULT 0,
  qty_current numeric(12,4) DEFAULT 0,
  unit varchar(50),
  storage_location varchar(200),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_lots_product ON lots(product_id);

-- Locations (magazzino fisico)
CREATE TABLE locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES venues(id),
  name varchar(200),
  capacity numeric(12,2),
  temp_controlled boolean DEFAULT false
);

-- Stock movements
CREATE TABLE stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES venues(id),
  product_id uuid REFERENCES products(id),
  lot_id uuid REFERENCES lots(id),
  movement_type varchar(50), -- in,out,adjustment,transfer,waste
  quantity numeric(12,4),
  reference_type varchar(100),
  reference_id uuid,
  user_id uuid REFERENCES users(id),
  notes text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_stock_prod ON stock_movements(product_id);

-- Tables (sala)
CREATE TABLE tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES venues(id),
  name varchar(100),
  seats integer,
  position_json jsonb,
  status varchar(50) DEFAULT 'free'
);

-- Reservations
CREATE TABLE reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES venues(id),
  customer_id uuid,
  table_id uuid REFERENCES tables(id),
  start_time timestamptz,
  end_time timestamptz,
  people_count integer,
  status varchar(50) DEFAULT 'pending',
  source varchar(100),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Orders
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES venues(id),
  table_id uuid REFERENCES tables(id),
  user_id uuid REFERENCES users(id),
  status varchar(50) DEFAULT 'draft',
  total numeric(12,4) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  qty integer,
  price numeric(12,4),
  lot_id uuid REFERENCES lots(id),
  notes text
);

-- Documents
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES venues(id),
  uploader_id uuid REFERENCES users(id),
  type varchar(50), -- ddt, invoice, other
  storage_path varchar(1024),
  parsed_json jsonb,
  status varchar(50) DEFAULT 'processing',
  created_at timestamptz DEFAULT now()
);

-- Temperature logs
CREATE TABLE temperature_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES venues(id),
  area varchar(200),
  temp numeric(6,2),
  recorded_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES users(id),
  notes text
);

-- Tickets manutentivi
CREATE TABLE tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES venues(id),
  area varchar(200),
  description text,
  priority varchar(50) DEFAULT 'medium',
  status varchar(50) DEFAULT 'open',
  reporter_id uuid REFERENCES users(id),
  assignee_id uuid REFERENCES users(id),
  cost numeric(12,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Customers & identities
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255),
  dob date,
  attrs jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE customer_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  provider varchar(100),
  identifier varchar(500),
  verified boolean DEFAULT false,
  source varchar(100),
  created_at timestamptz DEFAULT now(),
  UNIQUE(provider, identifier)
);

CREATE TABLE consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  purpose varchar(100),
  channel varchar(50),
  granted boolean,
  version text,
  granted_at timestamptz,
  revoked_at timestamptz
);

-- Indexes and constraints suggestions
CREATE INDEX idx_orders_table ON orders(table_id);
CREATE INDEX idx_reservations_venue_time ON reservations(venue_id, start_time);
CREATE INDEX idx_docs_status ON documents(status);