const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, 'haccp.sqlite');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to HACCP SQLite database');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  const tables = [
    // Company settings
    `CREATE TABLE IF NOT EXISTS company (
      id INTEGER NOT NULL DEFAULT 1,
      vat TEXT NOT NULL UNIQUE,
      gs1_code TEXT NOT NULL,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      cap INTEGER NOT NULL,
      city TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      PRIMARY KEY(vat)
    )`,
    
    // Settings
    `CREATE TABLE IF NOT EXISTS settings (
      id INTEGER NOT NULL DEFAULT 1 UNIQUE,
      db_version INTEGER NOT NULL DEFAULT 1,
      date_format TEXT NOT NULL DEFAULT 'dd/MM/yyyy',
      language TEXT NOT NULL DEFAULT 'en_EN',
      backup_last TEXT,
      backup_path TEXT,
      server_id TEXT,
      os_name TEXT,
      os_version TEXT
    )`,
    
    // Suppliers
    `CREATE TABLE IF NOT EXISTS supplier (
      id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
      vat TEXT NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT
    )`,
    
    // Customers
    `CREATE TABLE IF NOT EXISTS customer (
      id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
      vat TEXT NOT NULL,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      cap INTEGER NOT NULL,
      city TEXT NOT NULL,
      phone TEXT NOT NULL
    )`,
    
    // Measure units
    `CREATE TABLE IF NOT EXISTS measure_unit (
      name TEXT,
      symbol TEXT NOT NULL,
      PRIMARY KEY(symbol)
    )`,
    
    // Food in (raw materials)
    `CREATE TABLE IF NOT EXISTS food_in (
      id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
      name TEXT NOT NULL,
      unit_measure TEXT NOT NULL,
      source TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      gtin_number INTEGER
    )`,
    
    // Food out (processed foods)
    `CREATE TABLE IF NOT EXISTS food_out (
      id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
      name TEXT NOT NULL UNIQUE,
      unit_measure TEXT NOT NULL,
      fk_gtin INTEGER NOT NULL,
      FOREIGN KEY(fk_gtin) REFERENCES gtin_13(id)
    )`,
    
    // GTIN-13 codes
    `CREATE TABLE IF NOT EXISTS gtin_13 (
      id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      progressive INTEGER NOT NULL,
      code TEXT NOT NULL
    )`,
    
    // Lots in (incoming lots)
    `CREATE TABLE IF NOT EXISTS lot_in (
      id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
      acceptance_date TEXT NOT NULL,
      lot_number TEXT NOT NULL UNIQUE,
      ddt_number TEXT NOT NULL,
      ddt_date TEXT NOT NULL,
      expiry_date TEXT,
      quantity REAL NOT NULL,
      quantity_remaining REAL,
      fk_food_in INTEGER NOT NULL,
      fk_supplier INTEGER NOT NULL,
      FOREIGN KEY(fk_food_in) REFERENCES food_in(id),
      FOREIGN KEY(fk_supplier) REFERENCES supplier(id)
    )`,
    
    // Lots out (outgoing lots)
    `CREATE TABLE IF NOT EXISTS lot_out (
      id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
      lot_number TEXT NOT NULL UNIQUE,
      creation_date TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      quantity_of_food REAL NOT NULL,
      fk_food_out INTEGER,
      fk_lot_in INTEGER,
      FOREIGN KEY(fk_food_out) REFERENCES food_out(id),
      FOREIGN KEY(fk_lot_in) REFERENCES lot_in(id)
    )`,
    
    // Supply checks
    `CREATE TABLE IF NOT EXISTS supply_check (
      id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
      fk_lot_in INTEGER NOT NULL,
      date TEXT NOT NULL,
      protocol TEXT NOT NULL UNIQUE,
      qt_controlled REAL NOT NULL,
      qt_non_compliant INTEGER NOT NULL,
      dim_calib TEXT NOT NULL,
      FOREIGN KEY(fk_lot_in) REFERENCES lot_in(id)
    )`,
    
    // Packages
    `CREATE TABLE IF NOT EXISTS package (
      id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      measure TEXT NOT NULL,
      more_information INTEGER NOT NULL,
      variable INTEGER NOT NULL,
      fk_gtin INTEGER,
      FOREIGN KEY(fk_gtin) REFERENCES gtin_13(id)
    )`,
    
    // Package logistic
    `CREATE TABLE IF NOT EXISTS package_logistic (
      id INTEGER NOT NULL,
      description TEXT NOT NULL,
      measure TEXT NOT NULL,
      sscc_sequence INTEGER NOT NULL UNIQUE,
      sscc_number TEXT NOT NULL UNIQUE,
      PRIMARY KEY(id)
    )`,
    
    // Food out composition (recipes)
    `CREATE TABLE IF NOT EXISTS food_out_composition (
      fk_food_out INTEGER NOT NULL,
      fk_lot_in INTEGER NOT NULL,
      quantity REAL NOT NULL,
      FOREIGN KEY(fk_food_out) REFERENCES food_out(id),
      FOREIGN KEY(fk_lot_in) REFERENCES lot_in(id)
    )`,
    
    // Package food in relationships
    `CREATE TABLE IF NOT EXISTS package_foodIn (
      fk_package INTEGER NOT NULL,
      fk_food_in INTEGER NOT NULL,
      FOREIGN KEY(fk_package) REFERENCES package(id),
      FOREIGN KEY(fk_food_in) REFERENCES food_in(id)
    )`,
    
    // Package food out relationships
    `CREATE TABLE IF NOT EXISTS package_foodOut (
      fk_package INTEGER NOT NULL,
      fk_food_out INTEGER NOT NULL,
      FOREIGN KEY(fk_package) REFERENCES package(id),
      FOREIGN KEY(fk_food_out) REFERENCES food_out(id)
    )`,
    
    // Sales
    `CREATE TABLE IF NOT EXISTS sell (
      id INTEGER NOT NULL UNIQUE,
      invoice_number TEXT NOT NULL,
      invoice_date TEXT NOT NULL,
      fk_lot_out INTEGER,
      fk_lot_in INTEGER,
      fk_package INTEGER,
      fk_customer INTEGER NOT NULL,
      PRIMARY KEY(id),
      FOREIGN KEY(fk_lot_out) REFERENCES lot_out(id),
      FOREIGN KEY(fk_lot_in) REFERENCES lot_in(id),
      FOREIGN KEY(fk_package) REFERENCES package(id),
      FOREIGN KEY(fk_customer) REFERENCES customer(id)
    )`
  ];

  // Create tables sequentially
  function createTables(index = 0) {
    if (index >= tables.length) {
      // All tables created, now insert default data
      insertDefaultData();
      return;
    }

    db.run(tables[index], (err) => {
      if (err) {
        console.error(`Error creating table ${index}:`, err.message);
      } else {
        console.log(`Table ${index} created successfully`);
      }
      // Create next table
      createTables(index + 1);
    });
  }

  // Insert default data after all tables are created
  function insertDefaultData() {
    console.log('Inserting default data...');
    
    // Insert default measure units
    const defaultUnits = [
      ['Kilogram', 'kg'],
      ['Gram', 'g'],
      ['Liter', 'l'],
      ['Milliliter', 'ml'],
      ['Piece', 'pcs'],
      ['Box', 'box'],
      ['Package', 'pkg']
    ];

    defaultUnits.forEach(([name, symbol]) => {
      db.run(
        'INSERT OR IGNORE INTO measure_unit (name, symbol) VALUES (?, ?)',
        [name, symbol],
        (err) => {
          if (err) {
            console.error('Error inserting measure unit:', err.message);
          }
        }
      );
    });

    // Insert default settings
    db.run(
      `INSERT OR IGNORE INTO settings (id, db_version, date_format, language) 
       VALUES (1, 1, 'dd/MM/yyyy', 'en_EN')`,
      (err) => {
        if (err) {
          console.error('Error inserting default settings:', err.message);
        } else {
          console.log('Database initialization completed successfully');
        }
      }
    );
  }

  // Start creating tables
  createTables();
}

// Helper function to run queries with promises
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

// Helper function to get single row
function getRow(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

// Helper function to get multiple rows
function getAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

module.exports = {
  db,
  runQuery,
  getRow,
  getAll
}; 