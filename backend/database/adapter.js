const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// SQLite database for development
const getSqliteDb = () => {
  const dbPath = path.join(__dirname, 'haccp.sqlite');
  return new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening SQLite database:', err);
    } else {
      console.log('Connected to SQLite database');
    }
  });
};

// Initialize SQLite tables
const initializeSqliteDatabase = (db) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create tables
      db.run(`CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact_person TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact_person TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS foods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS lots_in (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lot_number TEXT UNIQUE NOT NULL,
        supplier_id INTEGER,
        food_id INTEGER,
        quantity REAL,
        unit TEXT,
        received_date DATE,
        expiry_date DATE,
        status TEXT DEFAULT 'received',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers (id),
        FOREIGN KEY (food_id) REFERENCES foods (id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS lots_out (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lot_number TEXT UNIQUE NOT NULL,
        customer_id INTEGER,
        food_id INTEGER,
        quantity REAL,
        unit TEXT,
        shipped_date DATE,
        status TEXT DEFAULT 'shipped',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers (id),
        FOREIGN KEY (food_id) REFERENCES foods (id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS packages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        package_code TEXT UNIQUE NOT NULL,
        lot_in_id INTEGER,
        lot_out_id INTEGER,
        quantity REAL,
        unit TEXT,
        package_date DATE,
        status TEXT DEFAULT 'packaged',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lot_in_id) REFERENCES lots_in (id),
        FOREIGN KEY (lot_out_id) REFERENCES lots_out (id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        check_type TEXT NOT NULL,
        lot_id INTEGER,
        lot_type TEXT,
        check_date DATE,
        result TEXT,
        notes TEXT,
        inspector TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        package_id INTEGER,
        sale_date DATE,
        quantity REAL,
        unit_price REAL,
        total_amount REAL,
        status TEXT DEFAULT 'completed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers (id),
        FOREIGN KEY (package_id) REFERENCES packages (id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS company (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        email TEXT,
        website TEXT,
        logo_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('SQLite database tables initialized successfully');
          resolve();
        }
      });
    });
  });
};

// Database factory
const getDatabase = () => {
  if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
    // Use PostgreSQL in production
    const { pool, initializeDatabase } = require('./postgres');
    return {
      type: 'postgres',
      pool,
      initialize: initializeDatabase
    };
  } else {
    // Use SQLite in development
    const db = getSqliteDb();
    return {
      type: 'sqlite',
      db,
      initialize: () => initializeSqliteDatabase(db)
    };
  }
};

module.exports = {
  getDatabase
}; 