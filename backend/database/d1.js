// Cloudflare D1 Database Adapter
// This adapter provides a unified interface for D1 database operations

class D1Database {
  constructor(d1) {
    this.d1 = d1;
  }

  async initialize() {
    try {
      console.log('Initializing D1 database...');
      
      // Create all tables
      await this.createCompanyTable();
      await this.createSettingsTable();
      await this.createSupplierTable();
      await this.createCustomerTable();
      await this.createFoodInTable();
      await this.createFoodOutTable();
      await this.createLotInTable();
      await this.createLotOutTable();
      await this.createSellTable();
      await this.createPackageTable();
      await this.createGtinTable();
      await this.createCheckTable();
      await this.createCheckResultTable();
      await this.createCheckTypeTable();
      await this.createCheckCategoryTable();
      await this.createBarcodeTable();
      await this.createTraceabilityTable();
      
      // Insert default data
      await this.insertDefaultData();
      
      console.log('D1 database initialized successfully');
    } catch (error) {
      console.error('Error initializing D1 database:', error);
      throw error;
    }
  }

  async createCompanyTable() {
    await this.d1.prepare(`
      CREATE TABLE IF NOT EXISTS company (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        vat TEXT,
        address TEXT,
        city TEXT,
        country TEXT,
        phone TEXT,
        email TEXT,
        website TEXT,
        logo TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  }

  async createSettingsTable() {
    await this.d1.prepare(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  }

  async createSupplierTable() {
    await this.d1.prepare(`
      CREATE TABLE IF NOT EXISTS supplier (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        vat TEXT,
        address TEXT,
        city TEXT,
        country TEXT,
        phone TEXT,
        email TEXT,
        website TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  }

  async createCustomerTable() {
    await this.d1.prepare(`
      CREATE TABLE IF NOT EXISTS customer (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        vat TEXT,
        address TEXT,
        city TEXT,
        country TEXT,
        phone TEXT,
        email TEXT,
        website TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  }

  async createFoodInTable() {
    await this.d1.prepare(`
      CREATE TABLE IF NOT EXISTS food_in (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        supplier_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES supplier (id)
      )
    `).run();
  }

  async createFoodOutTable() {
    await this.d1.prepare(`
      CREATE TABLE IF NOT EXISTS food_out (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  }

  async createLotInTable() {
    await this.d1.prepare(`
      CREATE TABLE IF NOT EXISTS lot_in (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lot_number TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        supplier_id INTEGER,
        food_id INTEGER,
        production_date DATE,
        expiry_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES supplier (id),
        FOREIGN KEY (food_id) REFERENCES food_in (id)
      )
    `).run();
  }

  async createLotOutTable() {
    await this.d1.prepare(`
      CREATE TABLE IF NOT EXISTS lot_out (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lot_number TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        food_id INTEGER,
        production_date DATE,
        expiry_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (food_id) REFERENCES food_out (id)
      )
    `).run();
  }

  async createSellTable() {
    await this.d1.prepare(`
      CREATE TABLE IF NOT EXISTS sell (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT NOT NULL,
        invoice_date DATE NOT NULL,
        fk_lot_out INTEGER,
        fk_lot_in INTEGER,
        fk_package INTEGER,
        fk_customer INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (fk_lot_out) REFERENCES lot_out (id),
        FOREIGN KEY (fk_lot_in) REFERENCES lot_in (id),
        FOREIGN KEY (fk_package) REFERENCES package (id),
        FOREIGN KEY (fk_customer) REFERENCES customer (id)
      )
    `).run();
  }

  async createPackageTable() {
    await this.d1.prepare(`
      CREATE TABLE IF NOT EXISTS package (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        measure TEXT NOT NULL,
        more_information INTEGER DEFAULT 0,
        variable INTEGER DEFAULT 0,
        fk_gtin INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (fk_gtin) REFERENCES gtin (id)
      )
    `).run();
  }

  async createGtinTable() {
    await this.d1.prepare(`
      CREATE TABLE IF NOT EXISTS gtin (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  }

  async createCheckTable() {
    await this.d1.prepare(`
      CREATE TABLE IF NOT EXISTS quality_check (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        frequency TEXT,
        fk_check_type INTEGER,
        fk_check_category INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (fk_check_type) REFERENCES check_type (id),
        FOREIGN KEY (fk_check_category) REFERENCES check_category (id)
      )
    `).run();
  }

  async createCheckResultTable() {
    await this.d1.prepare(`
      CREATE TABLE IF NOT EXISTS check_result (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        check_id INTEGER NOT NULL,
        result TEXT NOT NULL,
        notes TEXT,
        date DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (check_id) REFERENCES quality_check (id)
      )
    `).run();
  }

  async createCheckTypeTable() {
    await this.d1.prepare(`
      CREATE TABLE IF NOT EXISTS check_type (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  }

  async createCheckCategoryTable() {
    await this.d1.prepare(`
      CREATE TABLE IF NOT EXISTS check_category (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  }

  async createBarcodeTable() {
    await this.d1.prepare(`
      CREATE TABLE IF NOT EXISTS barcode (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        fk_lot_in INTEGER,
        fk_lot_out INTEGER,
        fk_package INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (fk_lot_in) REFERENCES lot_in (id),
        FOREIGN KEY (fk_lot_out) REFERENCES lot_out (id),
        FOREIGN KEY (fk_package) REFERENCES package (id)
      )
    `).run();
  }

  async createTraceabilityTable() {
    await this.d1.prepare(`
      CREATE TABLE IF NOT EXISTS traceability (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lot_in_id INTEGER,
        lot_out_id INTEGER,
        package_id INTEGER,
        customer_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lot_in_id) REFERENCES lot_in (id),
        FOREIGN KEY (lot_out_id) REFERENCES lot_out (id),
        FOREIGN KEY (package_id) REFERENCES package (id),
        FOREIGN KEY (customer_id) REFERENCES customer (id)
      )
    `).run();
  }

  async insertDefaultData() {
    // Insert default company
    await this.d1.prepare(`
      INSERT OR IGNORE INTO company (id, name, vat, address, city, country, phone, email, website)
      VALUES (1, 'Your Company Name', 'VAT123456789', '123 Business St', 'Business City', 'Country', '+1234567890', 'info@company.com', 'https://company.com')
    `).run();

    // Insert default settings
    await this.d1.prepare(`
      INSERT OR IGNORE INTO settings (key, value, description)
      VALUES 
        ('company_name', 'Your Company Name', 'Company name for reports'),
        ('company_address', '123 Business St, Business City, Country', 'Company address for reports'),
        ('system_version', '1.0.0', 'System version number')
    `).run();

    // Insert default check types
    await this.d1.prepare(`
      INSERT OR IGNORE INTO check_type (id, name, description)
      VALUES 
        (1, 'Visual', 'Visual inspection checks'),
        (2, 'Temperature', 'Temperature monitoring checks'),
        (3, 'Chemical', 'Chemical analysis checks'),
        (4, 'Microbiological', 'Microbiological testing checks')
    `).run();

    // Insert default check categories
    await this.d1.prepare(`
      INSERT OR IGNORE INTO check_category (id, name, description)
      VALUES 
        (1, 'Receiving', 'Checks performed when receiving goods'),
        (2, 'Storage', 'Checks performed during storage'),
        (3, 'Processing', 'Checks performed during processing'),
        (4, 'Shipping', 'Checks performed before shipping')
    `).run();
  }

  async runQuery(sql, params = []) {
    try {
      const stmt = this.d1.prepare(sql);
      const result = await stmt.bind(...params).run();
      
      // Return a standardized result object with id and changes
      return {
        id: result.meta?.last_row_id,
        changes: result.meta?.changes || 0,
        meta: result.meta
      };
    } catch (error) {
      console.error('Error running query:', error);
      throw error;
    }
  }

  async getRow(sql, params = []) {
    try {
      const stmt = this.d1.prepare(sql);
      const result = await stmt.bind(...params).first();
      return result;
    } catch (error) {
      console.error('Error getting row:', error);
      throw error;
    }
  }

  async getAll(sql, params = []) {
    try {
      const stmt = this.d1.prepare(sql);
      const result = await stmt.bind(...params).all();
      return result.results;
    } catch (error) {
      console.error('Error getting all rows:', error);
      throw error;
    }
  }

  getDb() {
    return this.d1;
  }
}

export default D1Database;
