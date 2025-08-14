import { Hono } from 'hono';

const router = new Hono();

// Test route
router.get('/test', (c) => {
  return c.json({ message: 'Test route works!' });
});

// List all foods (both raw and processed)
router.get('/list', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const [rawFoods, processedFoods] = await Promise.all([
      database.getAll(`
        SELECT 
          f.*,
          s.name as supplier_name,
          'raw' as type
        FROM food_in f
        LEFT JOIN supplier s ON f.supplier_id = s.id
        ORDER BY f.name
      `),
      database.getAll(`
        SELECT 
          f.*,
          'processed' as type
        FROM food_out f
        ORDER BY f.name
      `)
    ]);
    
    return c.json([...rawFoods, ...processedFoods]);
  } catch (error) {
    console.error('Error fetching foods:', error);
    return c.json({ error: 'Failed to fetch foods' }, 500);
  }
});

// Get all raw foods (food_in)
router.get('/raw', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const foods = await database.getAll(`
      SELECT 
        f.*,
        s.name as supplier_name
      FROM food_in f
      LEFT JOIN supplier s ON f.supplier_id = s.id
      ORDER BY f.name
    `);
    return c.json(foods);
  } catch (error) {
    console.error('Error fetching raw foods:', error);
    return c.json({ error: 'Failed to fetch raw foods' }, 500);
  }
});

// Get all processed foods (food_out)
router.get('/processed', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const foods = await database.getAll('SELECT * FROM food_out ORDER BY name');
    return c.json(foods);
  } catch (error) {
    console.error('Error fetching processed foods:', error);
    return c.json({ error: 'Failed to fetch processed foods' }, 500);
  }
});

// Create new raw food (food_in)
router.post('/raw', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const body = await c.req.json();
    const { name, description, category, supplier_id } = body;
    
    // Validate required fields
    if (!name) {
      return c.json({ error: 'Name is required' }, 400);
    }

    // Check if food name already exists
    const existingFood = await database.getRow('SELECT id FROM food_in WHERE name = ?', [name]);
    if (existingFood) {
      return c.json({ error: 'Food with this name already exists' }, 400);
    }

    const result = await database.runQuery(
      'INSERT INTO food_in (name, description, category, supplier_id) VALUES (?, ?, ?, ?)',
      [name, description || null, category || null, supplier_id || null]
    );

    // Check if we got a valid result
    if (!result || !result.id) {
      // If we can't get the ID, try to fetch the food by name
      const newFood = await database.getRow(
        'SELECT * FROM food_in WHERE name = ? ORDER BY created_at DESC LIMIT 1',
        [name]
      );
      if (newFood) {
        return c.json(newFood, 201);
      } else {
        return c.json({ 
          message: 'Food created successfully but could not retrieve details',
          success: true 
        }, 201);
      }
    }

    const newFood = await database.getRow('SELECT * FROM food_in WHERE id = ?', [result.id]);
    return c.json(newFood, 201);
  } catch (error) {
    console.error('Error creating raw food:', error);
    return c.json({ error: 'Failed to create raw food' }, 500);
  }
});

// Create new processed food (food_out)
router.post('/processed', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const body = await c.req.json();
    const { name, description, category } = body;
    
    // Validate required fields
    if (!name) {
      return c.json({ error: 'Name is required' }, 400);
    }

    // Check if food name already exists
    const existingFood = await database.getRow('SELECT id FROM food_out WHERE name = ?', [name]);
    if (existingFood) {
      return c.json({ error: 'Food with this name already exists' }, 400);
    }

    const result = await database.runQuery(
      'INSERT INTO food_out (name, description, category) VALUES (?, ?, ?)',
      [name, description || null, category || null]
    );

    // Check if we got a valid result
    if (!result || !result.id) {
      // If we can't get the ID, try to fetch the food by name
      const newFood = await database.getRow(
        'SELECT * FROM food_out WHERE name = ? ORDER BY created_at DESC LIMIT 1',
        [name]
      );
      if (newFood) {
        return c.json(newFood, 201);
      } else {
        return c.json({ 
          message: 'Food created successfully but could not retrieve details',
          success: true 
        }, 201);
      }
    }

    const newFood = await database.getRow('SELECT * FROM food_out WHERE id = ?', [result.id]);
    return c.json(newFood, 201);
  } catch (error) {
    console.error('Error creating processed food:', error);
    return c.json({ error: 'Failed to create processed food' }, 500);
  }
});

// Get foods statistics for dashboard
router.get('/stats/summary', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    // Get total raw foods count
    const rawFoodsResult = await database.getRow('SELECT COUNT(*) as count FROM food_in');
    const rawFoods = rawFoodsResult.count || 0;
    
    // Get total processed foods count
    const processedFoodsResult = await database.getRow('SELECT COUNT(*) as count FROM food_out');
    const processedFoods = processedFoodsResult.count || 0;
    
    // Get foods with lots count
    const rawFoodsWithLotsResult = await database.getRow('SELECT COUNT(DISTINCT food_id) as count FROM lot_in WHERE food_id IS NOT NULL');
    const rawFoodsWithLots = rawFoodsWithLotsResult.count || 0;
    
    const processedFoodsWithLotsResult = await database.getRow('SELECT COUNT(DISTINCT food_id) as count FROM lot_out WHERE food_id IS NOT NULL');
    const processedFoodsWithLots = processedFoodsWithLotsResult.count || 0;
    
    return c.json({
      totalRawFoods: rawFoods,
      totalProcessedFoods: processedFoods,
      rawFoodsWithLots,
      processedFoodsWithLots,
      totalFoods: rawFoods + processedFoods
    });
  } catch (error) {
    console.error('Error fetching foods stats:', error);
    return c.json({ error: 'Failed to fetch foods statistics' }, 500);
  }
});

export default router; 