import { Hono } from 'hono';

const router = new Hono();

// Get all checks
router.get('/', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const checks = await database.getAll(`
      SELECT 
        c.*,
        ct.name as check_type_name,
        cc.name as check_category_name
      FROM quality_check c
      LEFT JOIN check_type ct ON c.fk_check_type = ct.id
      LEFT JOIN check_category cc ON c.fk_check_category = cc.id
      ORDER BY c.created_at DESC
    `);
    return c.json(checks);
  } catch (error) {
    console.error('Error fetching checks:', error);
    return c.json({ error: 'Failed to fetch checks' }, 500);
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
        ct.name as check_type_name,
        cc.name as check_category_name
      FROM quality_check c
      LEFT JOIN check_type ct ON c.fk_check_type = ct.id
      LEFT JOIN check_category cc ON c.fk_check_category = cc.id
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
    const { name, description, frequency, fk_check_type, fk_check_category } = body;
    
    // Validate required fields
    if (!name) {
      return c.json({ error: 'Name is required' }, 400);
    }

    const result = await database.runQuery(
      'INSERT INTO quality_check (name, description, frequency, fk_check_type, fk_check_category) VALUES (?, ?, ?, ?, ?)',
      [name, description || null, frequency || null, fk_check_type || null, fk_check_category || null]
    );

    const newCheck = await database.getRow(`
      SELECT 
        c.*,
        ct.name as check_type_name,
        cc.name as check_category_name
      FROM quality_check c
      LEFT JOIN check_type ct ON c.fk_check_type = ct.id
      LEFT JOIN check_category cc ON c.fk_check_category = cc.id
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
    const { name, description, frequency, fk_check_type, fk_check_category } = body;
    const checkId = c.req.param('id');

    // Validate required fields
    if (!name) {
      return c.json({ error: 'Name is required' }, 400);
    }

    // Check if check exists
    const existingCheck = await database.getRow('SELECT id FROM quality_check WHERE id = ?', [checkId]);
    if (!existingCheck) {
      return c.json({ error: 'Check not found' }, 404);
    }

    await database.runQuery(
      'UPDATE quality_check SET name = ?, description = ?, frequency = ?, fk_check_type = ?, fk_check_category = ? WHERE id = ?',
      [name, description || null, frequency || null, fk_check_type || null, fk_check_category || null, checkId]
    );

    const updatedCheck = await database.getRow(`
      SELECT 
        c.*,
        ct.name as check_type_name,
        cc.name as check_category_name
      FROM quality_check c
      LEFT JOIN check_type ct ON c.fk_check_type = ct.id
      LEFT JOIN check_category cc ON c.fk_check_category = cc.id
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