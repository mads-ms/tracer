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
      
      // Migrate existing tables if needed
      await this.migrateTables();
      
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
    // Always check if migration is needed, even if table exists
    await this.migrateQualityCheckTable();
    
    // Table creation is now handled by migration
    console.log('createCheckTable completed - table creation handled by migration');
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

  async migrateTables() {
    try {
      console.log('Checking for table migrations...');
      
      // Other table migrations can go here in the future
      
    } catch (error) {
      console.error('Error during table migrations:', error);
      // Continue with initialization even if migration fails
    }
  }

  async migrateQualityCheckTable() {
    try {
      console.log('Checking quality_check table for migration...');
      
      // Check if quality_check table exists and what schema it has
      let tableExists = false;
      try {
        const tableInfo = await this.d1.prepare("PRAGMA table_info(quality_check)").all();
        tableExists = true;
        const columns = tableInfo.results.map(col => col.name);
        
        console.log('Current quality_check columns:', columns);
        
        // If table has old schema (name, description, frequency columns)
        if (columns.includes('name') && columns.includes('description') && columns.includes('frequency')) {
          console.log('Migrating quality_check table to new schema...');
          
          // Check if there are any existing records
          const existingRecords = await this.d1.prepare('SELECT COUNT(*) as count FROM quality_check').first();
          const hasData = existingRecords && existingRecords.count > 0;
          
          if (hasData) {
            console.log('Table has existing data, using ALTER TABLE approach...');
            
            // Add new columns to existing table
            try {
              await this.d1.prepare('ALTER TABLE quality_check ADD COLUMN fk_lot_in INTEGER').run();
            } catch (e) {
              console.log('Column fk_lot_in already exists or error:', e.message);
            }
            
            try {
              await this.d1.prepare('ALTER TABLE quality_check ADD COLUMN date TEXT').run();
            } catch (e) {
              console.log('Column date already exists or error:', e.message);
            }
            
            try {
              await this.d1.prepare('ALTER TABLE quality_check ADD COLUMN protocol TEXT').run();
            } catch (e) {
              console.log('Column protocol already exists or error:', e.message);
            }
            
            try {
              await this.d1.prepare('ALTER TABLE quality_check ADD COLUMN qt_controlled REAL').run();
            } catch (e) {
              console.log('Column qt_controlled already exists or error:', e.message);
            }
            
            try {
              await this.d1.prepare('ALTER TABLE quality_check ADD COLUMN qt_non_compliant INTEGER').run();
            } catch (e) {
              console.log('Column qt_non_compliant already exists or error:', e.message);
            }
            
            try {
              await this.d1.prepare('ALTER TABLE quality_check ADD COLUMN dim_calib TEXT').run();
            } catch (e) {
              console.log('Column dim_calib already exists or error:', e.message);
            }
            
            // Drop old columns that are no longer needed
            try {
              await this.d1.prepare('ALTER TABLE quality_check DROP COLUMN name').run();
            } catch (e) {
              console.log('Column name already dropped or error:', e.message);
            }
            
            try {
              await this.d1.prepare('ALTER TABLE quality_check DROP COLUMN description').run();
            } catch (e) {
              console.log('Column description already dropped or error:', e.message);
            }
            
            try {
              await this.d1.prepare('ALTER TABLE quality_check DROP COLUMN frequency').run();
            } catch (e) {
              console.log('Column frequency already dropped or error:', e.message);
            }
            
            try {
              await this.d1.prepare('ALTER TABLE quality_check DROP COLUMN fk_check_type').run();
            } catch (e) {
              console.log('Column fk_check_type already dropped or error:', e.message);
            }
            
            try {
              await this.d1.prepare('ALTER TABLE quality_check DROP COLUMN fk_check_category').run();
            } catch (e) {
              console.log('Column fk_check_category already dropped or error:', e.message);
            }
            
            console.log('quality_check table migrated using ALTER TABLE approach');
          } else {
            console.log('Table has no data, recreating with new schema...');
            
            // Drop and recreate table (safe when no data exists)
            await this.d1.prepare('DROP TABLE quality_check').run();
            tableExists = false; // Force recreation
            
            console.log('quality_check table dropped for recreation');
          }
          
        } else if (columns.includes('fk_lot_in') && columns.includes('protocol')) {
          console.log('quality_check table already has new schema');
        } else {
          console.log('quality_check table has unknown schema, will be created fresh');
          tableExists = false; // Force recreation
        }
        
      } catch (tableError) {
        console.log('quality_check table does not exist, will be created fresh');
        tableExists = false;
      }
      
      // If table doesn't exist or was dropped, create it with new schema
      if (!tableExists) {
        console.log('Creating quality_check table with new schema...');
        await this.d1.prepare(`
          CREATE TABLE quality_check (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fk_lot_in INTEGER NOT NULL,
            date TEXT NOT NULL,
            protocol TEXT NOT NULL UNIQUE,
            qt_controlled REAL NOT NULL,
            qt_non_compliant INTEGER NOT NULL,
            dim_calib TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (fk_lot_in) REFERENCES lot_in (id)
          )
        `).run();
        console.log('quality_check table created successfully with new schema');
      }
      
      // If table doesn't exist or was dropped, it will be created by the calling method
      return tableExists;
      
    } catch (error) {
      console.error('Error during quality_check table migration:', error);
      return false; // Force table creation on error
    }
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
      // If we get a "table doesn't exist" error, try to initialize
      if (error.message && error.message.includes('no such table')) {
        console.log('Table missing, attempting to initialize database...');
        try {
          await this.initialize();
          // Retry the original query
          const stmt = this.d1.prepare(sql);
          const result = await stmt.bind(...params).run();
          return {
            id: result.meta?.last_row_id,
            changes: result.meta?.changes || 0,
            meta: result.meta
          };
        } catch (initError) {
          console.error('Failed to initialize database:', initError);
          throw error; // Throw the original error
        }
      }
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
