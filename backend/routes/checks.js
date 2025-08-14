import { Hono } from 'hono';

const router = new Hono();

// Simple test endpoint
router.get('/test', (c) => {
  return c.json({ message: 'Checks route is working!' });
});

// Database test endpoint
router.get('/test-db', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    // Test basic database operations
    const result = await database.runQuery('SELECT 1 as test');
    
    return c.json({ 
      message: 'Database connection works!', 
      testResult: result,
      databaseType: typeof database,
      methods: Object.getOwnPropertyNames(database)
    });
  } catch (error) {
    console.error('Database test error:', error);
    return c.json({ 
      error: 'Database test failed', 
      details: error.message,
      stack: error.stack
    }, 500);
  }
});

// Middleware to ensure table is migrated
router.use('*', async (c, next) => {
  try {
    console.log('Migration middleware running...');
    
    const database = c.get('database');
    console.log('Database object:', database ? 'exists' : 'missing');
    
    if (database && typeof database.migrateQualityCheckTable === 'function') {
      console.log('Calling migrateQualityCheckTable...');
      await database.migrateQualityCheckTable();
      console.log('Migration completed');
    } else {
      console.log('migrateQualityCheckTable method not found');
      console.log('Database methods:', Object.getOwnPropertyNames(database || {}));
    }
  } catch (error) {
    console.error('Error in migration middleware:', error);
    console.error('Error stack:', error.stack);
  }
  await next();
});

// Get all checks
router.get('/', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    console.log('Database object type:', typeof database);
    console.log('Database methods:', Object.getOwnPropertyNames(database));
    
    // First, let's check what columns actually exist
    try {
      console.log('Attempting to get table info...');
      const tableInfo = await database.getAll("PRAGMA table_info(quality_check)");
      console.log('Table info received:', tableInfo);
      
      // Check if we have the new schema
      const hasNewSchema = tableInfo.some(col => col.name === 'fk_lot_in');
      console.log('Has new schema:', hasNewSchema);
      
      if (hasNewSchema) {
        // Use new schema
        console.log('Using new schema query...');
        const checks = await database.getAll(`
          SELECT 
            c.*,
            l.lot_number,
            l.quantity as lot_quantity,
            l.unit as lot_unit,
            s.name as supplier_name,
            f.name as food_name
          FROM quality_check c
          LEFT JOIN lot_in l ON c.fk_lot_in = l.id
          LEFT JOIN supplier s ON l.supplier_id = s.id
          LEFT JOIN food_in f ON l.food_id = f.id
          ORDER BY c.created_at DESC
        `);
        console.log('New schema query successful, returning', checks.length, 'checks');
        return c.json(checks);
      } else {
        // Use old schema temporarily
        console.log('Using old schema temporarily');
        const checks = await database.getAll(`
          SELECT 
            c.*,
            'N/A' as lot_number,
            'N/A' as supplier_name,
            'N/A' as food_name
          FROM quality_check c
          ORDER BY c.created_at DESC
        `);
        console.log('Old schema query successful, returning', checks.length, 'checks');
        return c.json(checks);
      }
    } catch (error) {
      console.error('Error checking table structure:', error);
      console.error('Error stack:', error.stack);
      return c.json({ 
        error: 'Failed to check table structure', 
        details: error.message,
        stack: error.stack
      }, 500);
    }
  } catch (error) {
    console.error('Error in main GET route:', error);
    console.error('Error stack:', error.stack);
    return c.json({ 
      error: 'Failed to fetch checks', 
      details: error.message,
      stack: error.stack
    }, 500);
  }
});

// Manual migration endpoint
router.post('/migrate', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    console.log('Manual migration triggered');
    
    if (typeof database.migrateQualityCheckTable === 'function') {
      console.log('Calling migrateQualityCheckTable...');
      await database.migrateQualityCheckTable();
      console.log('Manual migration completed');
      return c.json({ message: 'Migration completed successfully' });
    } else {
      console.log('Migration method not available');
      console.log('Available methods:', Object.getOwnPropertyNames(database));
      return c.json({ error: 'Migration method not available' }, 500);
    }
  } catch (error) {
    console.error('Manual migration error:', error);
    return c.json({ error: 'Migration failed', details: error.message }, 500);
  }
});

// Debug endpoint to check table structure
router.get('/debug/structure', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const tableInfo = await database.getAll("PRAGMA table_info(quality_check)");
    const columns = tableInfo.map(col => ({
      name: col.name,
      type: col.type,
      notnull: col.notnull,
      pk: col.pk
    }));
    
    return c.json({
      tableName: 'quality_check',
      columns,
      columnCount: columns.length,
      hasNewSchema: columns.some(col => col.name === 'fk_lot_in'),
      hasOldSchema: columns.some(col => col.name === 'name')
    });
  } catch (error) {
    console.error('Debug structure error:', error);
    return c.json({ error: 'Failed to get table structure', details: error.message }, 500);
  }
});

// Get check by ID
router.get('/:id', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const check = await database.getRow(`
      SELECT 
        c.*,
        l.lot_number,
        l.quantity as lot_quantity,
        l.unit as lot_unit,
        s.name as supplier_name,
        f.name as food_name
      FROM quality_check c
      LEFT JOIN lot_in l ON c.fk_lot_in = l.id
      LEFT JOIN supplier s ON l.supplier_id = s.id
      LEFT JOIN food_in f ON l.food_id = f.id
      WHERE c.id = ?
    `, [c.req.param('id')]);
    
    if (!check) {
      return c.json({ error: 'Check not found' }, 404);
    }
    return c.json(check);
  } catch (error) {
    console.error('Error fetching check:', error);
    return c.json({ error: 'Failed to fetch check' }, 500);
  }
});

// Create new check
router.post('/', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const body = await c.req.json();
    const { fk_lot_in, date, protocol, qt_controlled, qt_non_compliant, dim_calib } = body;
    
    // Validate required fields
    if (!fk_lot_in || !date || !protocol || qt_controlled === undefined || qt_non_compliant === undefined || !dim_calib) {
      return c.json({ error: 'All fields are required' }, 400);
    }

    // Check if protocol already exists
    const existingProtocol = await database.getRow('SELECT id FROM quality_check WHERE protocol = ?', [protocol]);
    if (existingProtocol) {
      return c.json({ error: 'Protocol number already exists' }, 400);
    }

    const result = await database.runQuery(
      'INSERT INTO quality_check (fk_lot_in, date, protocol, qt_controlled, qt_non_compliant, dim_calib) VALUES (?, ?, ?, ?, ?, ?)',
      [fk_lot_in, date, protocol, qt_controlled, qt_non_compliant, dim_calib]
    );

    const newCheck = await database.getRow(`
      SELECT 
        c.*,
        l.lot_number,
        l.quantity as lot_quantity,
        l.unit as lot_unit,
        s.name as supplier_name,
        f.name as food_name
      FROM quality_check c
      LEFT JOIN lot_in l ON c.fk_lot_in = l.id
      LEFT JOIN supplier s ON l.supplier_id = s.id
      LEFT JOIN food_in f ON l.food_id = f.id
      WHERE c.id = ?
    `, [result.id]);
    
    return c.json(newCheck, 201);
  } catch (error) {
    console.error('Error creating check:', error);
    return c.json({ error: 'Failed to create check' }, 500);
  }
});

// Update check
router.put('/:id', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const body = await c.req.json();
    const { fk_lot_in, date, protocol, qt_controlled, qt_non_compliant, dim_calib } = body;
    const checkId = c.req.param('id');

    // Validate required fields
    if (!fk_lot_in || !date || !protocol || qt_controlled === undefined || qt_non_compliant === undefined || !dim_calib) {
      return c.json({ error: 'All fields are required' }, 400);
    }

    // Check if check exists
    const existingCheck = await database.getRow('SELECT id FROM quality_check WHERE id = ?', [checkId]);
    if (!existingCheck) {
      return c.json({ error: 'Check not found' }, 404);
    }

    // Check if protocol already exists for other checks
    const existingProtocol = await database.getRow('SELECT id FROM quality_check WHERE protocol = ? AND id != ?', [protocol, checkId]);
    if (existingProtocol) {
      return c.json({ error: 'Protocol number already exists' }, 400);
    }

    await database.runQuery(
      'UPDATE quality_check SET fk_lot_in = ?, date = ?, protocol = ?, qt_controlled = ?, qt_non_compliant = ?, dim_calib = ? WHERE id = ?',
      [fk_lot_in, date, protocol, qt_controlled, qt_non_compliant, dim_calib, checkId]
    );

    const updatedCheck = await database.getRow(`
      SELECT 
        c.*,
        l.lot_number,
        l.quantity as lot_quantity,
        l.unit as lot_unit,
        s.name as supplier_name,
        f.name as food_name
      FROM quality_check c
      LEFT JOIN lot_in l ON c.fk_lot_in = l.id
      LEFT JOIN supplier s ON l.supplier_id = s.id
      LEFT JOIN food_in f ON l.food_id = f.id
      WHERE c.id = ?
    `, [checkId]);
    
    return c.json(updatedCheck);
  } catch (error) {
    console.error('Error updating check:', error);
    return c.json({ error: 'Failed to update check' }, 500);
  }
});

// Delete check
router.delete('/:id', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const checkId = c.req.param('id');

    // Check if check exists
    const existingCheck = await database.getRow('SELECT id FROM quality_check WHERE id = ?', [checkId]);
    if (!existingCheck) {
      return c.json({ error: 'Check not found' }, 404);
    }

    // Check if check is referenced in check results
    const referencedInResults = await database.getRow('SELECT id FROM check_result WHERE check_id = ? LIMIT 1', [checkId]);
    if (referencedInResults) {
      return c.json({ error: 'Cannot delete check: referenced in check results' }, 400);
    }

    await database.runQuery('DELETE FROM quality_check WHERE id = ?', [checkId]);
    return c.json({ message: 'Check deleted successfully' });
  } catch (error) {
    console.error('Error deleting check:', error);
    return c.json({ error: 'Failed to delete check' }, 500);
  }
});

// Get checks statistics for dashboard
router.get('/stats/summary', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    // Get total checks count
    const totalChecksResult = await database.getRow('SELECT COUNT(*) as count FROM quality_check');
    const totalChecks = totalChecksResult.count || 0;
    
    // Get checks with results count
    const checksWithResultsResult = await database.getRow('SELECT COUNT(DISTINCT check_id) as count FROM check_result');
    const checksWithResults = checksWithResultsResult.count || 0;
    
    // Get total check results count
    const totalResultsResult = await database.getRow('SELECT COUNT(*) as count FROM check_result');
    const totalResults = totalResultsResult.count || 0;
    
    return c.json({
      totalChecks,
      checksWithResults,
      checksWithoutResults: totalChecks - checksWithResults,
      totalResults
    });
  } catch (error) {
    console.error('Error fetching checks stats:', error);
    return c.json({ error: 'Failed to fetch checks statistics' }, 500);
  }
});

export default router; 