import { Hono } from 'hono';

const router = new Hono();

// Get all incoming lots
router.get('/', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const lots = await database.getAll(`
      SELECT 
        li.*,
        fi.name as food_name,
        fi.description as food_description,
        fi.category as food_category,
        s.name as supplier_name,
        s.vat as supplier_vat,
        s.city as supplier_city,
        s.country as supplier_country
      FROM lot_in li
      LEFT JOIN food_in fi ON li.food_id = fi.id
      LEFT JOIN supplier s ON li.supplier_id = s.id
      ORDER BY li.created_at DESC
    `);
    return c.json(lots);
  } catch (error) {
    console.error('Error fetching incoming lots:', error);
    return c.json({ error: 'Failed to fetch incoming lots' }, 500);
  }
});

// Get incoming lot by ID
router.get('/:id', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const lot = await database.getRow(`
      SELECT 
        li.*,
        fi.name as food_name,
        fi.description as food_description,
        fi.category as food_category,
        s.name as supplier_name,
        s.vat as supplier_vat,
        s.city as supplier_city,
        s.country as supplier_country
      FROM lot_in li
      LEFT JOIN food_in fi ON li.food_id = fi.id
      LEFT JOIN supplier s ON li.supplier_id = s.id
      WHERE li.id = ?
    `, [c.req.param('id')]);
    
    if (!lot) {
      return c.json({ error: 'Lot not found' }, 404);
    }
    return c.json(lot);
  } catch (error) {
    console.error('Error fetching lot:', error);
    return c.json({ error: 'Failed to fetch lot' }, 500);
  }
});

// Create new incoming lot
router.post('/', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const body = await c.req.json();
    const { 
      lot_number, 
      quantity, 
      unit, 
      supplier_id, 
      food_id, 
      production_date, 
      expiry_date 
    } = body;
    
    // Validate required fields
    if (!lot_number || !quantity || !unit || !supplier_id || !food_id) {
      return c.json({ error: 'Lot number, quantity, unit, supplier, and food are required' }, 400);
    }

    // Check if lot number already exists
    const existingLot = await database.getRow('SELECT id FROM lot_in WHERE lot_number = ?', [lot_number]);
    if (existingLot) {
      return c.json({ error: 'Lot number already exists' }, 400);
    }

    // Check if food exists
    const food = await database.getRow('SELECT id FROM food_in WHERE id = ?', [food_id]);
    if (!food) {
      return c.json({ error: 'Food not found' }, 400);
    }

    // Check if supplier exists
    const supplier = await database.getRow('SELECT id FROM supplier WHERE id = ?', [supplier_id]);
    if (!supplier) {
      return c.json({ error: 'Supplier not found' }, 400);
    }

    const result = await database.runQuery(
      `INSERT INTO lot_in (
        lot_number, quantity, unit, supplier_id, food_id, production_date, expiry_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [lot_number, quantity, unit, supplier_id, food_id, production_date || null, expiry_date || null]
    );

    // Check if we got a valid result
    if (!result || !result.id) {
      // If we can't get the ID, try to fetch the lot by lot_number
      const newLot = await database.getRow(
        'SELECT * FROM lot_in WHERE lot_number = ? ORDER BY created_at DESC LIMIT 1',
        [lot_number]
      );
      if (newLot) {
        return c.json(newLot, 201);
      } else {
        return c.json({ 
          message: 'Lot created successfully but could not retrieve details',
          success: true 
        }, 201);
      }
    }

    const newLot = await database.getRow(`
      SELECT 
        li.*,
        fi.name as food_name,
        fi.description as food_description,
        fi.category as food_category,
        s.name as supplier_name,
        s.vat as supplier_vat,
        s.city as supplier_city,
        s.country as supplier_country
      FROM lot_in li
      LEFT JOIN food_in fi ON li.food_id = fi.id
      LEFT JOIN supplier s ON li.supplier_id = s.id
      WHERE li.id = ?
    `, [result.id]);
    
    return c.json(newLot, 201);
  } catch (error) {
    console.error('Error creating incoming lot:', error);
    return c.json({ error: 'Failed to create incoming lot' }, 500);
  }
});

// Update incoming lot
router.put('/:id', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const body = await c.req.json();
    const { 
      lot_number, 
      quantity, 
      unit, 
      supplier_id, 
      food_id, 
      production_date, 
      expiry_date 
    } = body;
    const lotId = c.req.param('id');

    // Validate required fields
    if (!lot_number || !quantity || !unit || !supplier_id || !food_id) {
      return c.json({ error: 'Lot number, quantity, unit, supplier, and food are required' }, 400);
    }

    // Check if lot exists
    const existingLot = await database.getRow('SELECT id FROM lot_in WHERE id = ?', [lotId]);
    if (!existingLot) {
      return c.json({ error: 'Lot not found' }, 404);
    }

    // Check if lot number already exists for another lot
    const duplicateLotNumber = await database.getRow('SELECT id FROM lot_in WHERE lot_number = ? AND id != ?', [lot_number, lotId]);
    if (duplicateLotNumber) {
      return c.json({ error: 'Lot number already exists' }, 400);
    }

    // Check if food exists
    const food = await database.getRow('SELECT id FROM food_in WHERE id = ?', [food_id]);
    if (!food) {
      return c.json({ error: 'Food not found' }, 400);
    }

    // Check if supplier exists
    const supplier = await database.getRow('SELECT id FROM supplier WHERE id = ?', [supplier_id]);
    if (!supplier) {
      return c.json({ error: 'Supplier not found' }, 400);
    }

    await database.runQuery(
      `UPDATE lot_in SET 
        lot_number = ?, quantity = ?, unit = ?, supplier_id = ?, food_id = ?, 
        production_date = ?, expiry_date = ? 
      WHERE id = ?`,
      [lot_number, quantity, unit, supplier_id, food_id, production_date || null, expiry_date || null, lotId]
    );

    const updatedLot = await database.getRow(`
      SELECT 
        li.*,
        fi.name as food_name,
        fi.description as food_description,
        fi.category as food_category,
        s.name as supplier_name,
        s.vat as supplier_vat,
        s.city as supplier_city,
        s.country as supplier_country
      FROM lot_in li
      LEFT JOIN food_in fi ON li.food_id = fi.id
      LEFT JOIN supplier s ON li.supplier_id = s.id
      WHERE li.id = ?
    `, [lotId]);
    
    return c.json(updatedLot);
  } catch (error) {
    console.error('Error updating incoming lot:', error);
    return c.json({ error: 'Failed to update incoming lot' }, 500);
  }
});

// Delete incoming lot
router.delete('/:id', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const lotId = c.req.param('id');

    // Check if lot exists
    const existingLot = await database.getRow('SELECT id FROM lot_in WHERE id = ?', [lotId]);
    if (!existingLot) {
      return c.json({ error: 'Lot not found' }, 404);
    }

    // Check if lot is referenced in sales
    const referencedInSales = await database.getRow('SELECT id FROM sell WHERE fk_lot_in = ? LIMIT 1', [lotId]);
    if (referencedInSales) {
      return c.json({ error: 'Cannot delete lot: referenced in sales' }, 400);
    }

    await database.runQuery('DELETE FROM lot_in WHERE id = ?', [lotId]);
    return c.json({ message: 'Incoming lot deleted successfully' });
  } catch (error) {
    console.error('Error deleting incoming lot:', error);
    return c.json({ error: 'Failed to delete incoming lot' }, 500);
  }
});

// Get incoming lots statistics for dashboard
router.get('/stats/summary', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    // Get total incoming lots count
    const totalLotsResult = await database.getRow('SELECT COUNT(*) as count FROM lot_in');
    const totalLots = totalLotsResult.count || 0;
    
    // Get total quantity
    const totalQuantityResult = await database.getRow('SELECT SUM(quantity) as total FROM lot_in');
    const totalQuantity = totalQuantityResult.total || 0;
    
    // Get lots expiring soon (within 30 days)
    const expiringSoonResult = await database.getRow(`
      SELECT COUNT(*) as count 
      FROM lot_in 
      WHERE expiry_date IS NOT NULL 
      AND expiry_date <= date('now', '+30 days')
      AND expiry_date >= date('now')
    `);
    const expiringSoon = expiringSoonResult.count || 0;
    
    // Get lots by supplier count
    const suppliersCountResult = await database.getRow('SELECT COUNT(DISTINCT supplier_id) as count FROM lot_in WHERE supplier_id IS NOT NULL');
    const suppliersCount = suppliersCountResult.count || 0;
    
    // Get lots by food count
    const foodsCountResult = await database.getRow('SELECT COUNT(DISTINCT food_id) as count FROM lot_in WHERE food_id IS NOT NULL');
    const foodsCount = foodsCountResult.count || 0;
    
    return c.json({
      totalLots,
      totalQuantity,
      expiringSoon,
      suppliersCount,
      foodsCount
    });
  } catch (error) {
    console.error('Error fetching incoming lots stats:', error);
    return c.json({ error: 'Failed to fetch incoming lots statistics' }, 500);
  }
});

export default router; 