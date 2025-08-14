import { Hono } from 'hono';

const router = new Hono();

// Get all barcodes
router.get('/', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const barcodes = await database.getAll(`
      SELECT 
        b.*,
        li.lot_number as lot_in_number,
        lo.lot_number as lot_out_number,
        p.description as package_description
      FROM barcode b
      LEFT JOIN lot_in li ON b.fk_lot_in = li.id
      LEFT JOIN lot_out lo ON b.fk_lot_out = lo.id
      LEFT JOIN package p ON b.fk_package = p.id
      ORDER BY b.created_at DESC
    `);
    return c.json(barcodes);
  } catch (error) {
    console.error('Error fetching barcodes:', error);
    return c.json({ error: 'Failed to fetch barcodes' }, 500);
  }
});

// Get barcode by ID
router.get('/:id', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const barcode = await database.getRow(`
      SELECT 
        b.*,
        li.lot_number as lot_in_number,
        lo.lot_number as lot_out_number,
        p.description as package_description
      FROM barcode b
      LEFT JOIN lot_in li ON b.fk_lot_in = li.id
      LEFT JOIN lot_out lo ON b.fk_lot_out = lo.id
      LEFT JOIN package p ON b.fk_package = p.id
      WHERE b.id = ?
    `, [c.req.param('id')]);
    
    if (!barcode) {
      return c.json({ error: 'Barcode not found' }, 404);
    }
    return c.json(barcode);
  } catch (error) {
    console.error('Error fetching barcode:', error);
    return c.json({ error: 'Failed to fetch barcode' }, 500);
  }
});

// Create new barcode
router.post('/', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const body = await c.req.json();
    const { code, type, description, fk_lot_in, fk_lot_out, fk_package } = body;
    
    // Validate required fields
    if (!code || !type) {
      return c.json({ error: 'Code and type are required' }, 400);
    }

    // Check if code already exists
    const existingCode = await database.getRow('SELECT id FROM barcode WHERE code = ?', [code]);
    if (existingCode) {
      return c.json({ error: 'Barcode code already exists' }, 400);
    }

    // Validate that at least one reference is provided
    if (!fk_lot_in && !fk_lot_out && !fk_package) {
      return c.json({ error: 'At least one reference (lot_in, lot_out, or package) must be provided' }, 400);
    }

    // Check if lot_in exists (if provided)
    if (fk_lot_in) {
      const lotIn = await database.getRow('SELECT id FROM lot_in WHERE id = ?', [fk_lot_in]);
      if (!lotIn) {
        return c.json({ error: 'Incoming lot not found' }, 400);
      }
    }

    // Check if lot_out exists (if provided)
    if (fk_lot_out) {
      const lotOut = await database.getRow('SELECT id FROM lot_out WHERE id = ?', [fk_lot_out]);
      if (!lotOut) {
        return c.json({ error: 'Outgoing lot not found' }, 400);
      }
    }

    // Check if package exists (if provided)
    if (fk_package) {
      const packageItem = await database.getRow('SELECT id FROM package WHERE id = ?', [fk_package]);
      if (!packageItem) {
        return c.json({ error: 'Package not found' }, 400);
      }
    }

    const result = await database.runQuery(
      'INSERT INTO barcode (code, type, description, fk_lot_in, fk_lot_out, fk_package) VALUES (?, ?, ?, ?, ?, ?)',
      [code, type, description || null, fk_lot_in || null, fk_lot_out || null, fk_package || null]
    );

    // Check if we got a valid result
    if (!result || !result.id) {
      // If we can't get the ID, try to fetch the barcode by code
      const newBarcode = await database.getRow(
        'SELECT * FROM barcode WHERE code = ? ORDER BY created_at DESC LIMIT 1',
        [code]
      );
      if (newBarcode) {
        return c.json(newBarcode, 201);
      } else {
        return c.json({ 
          message: 'Barcode created successfully but could not retrieve details',
          success: true 
        }, 201);
      }
    }

    const newBarcode = await database.getRow(`
      SELECT 
        b.*,
        li.lot_number as lot_in_number,
        lo.lot_number as lot_out_number,
        p.description as package_description
      FROM barcode b
      LEFT JOIN lot_in li ON b.fk_lot_in = li.id
      LEFT JOIN lot_out lo ON b.fk_lot_out = lo.id
      LEFT JOIN package p ON b.fk_package = p.id
      WHERE b.id = ?
    `, [result.id]);
    
    return c.json(newBarcode, 201);
  } catch (error) {
    console.error('Error creating barcode:', error);
    return c.json({ error: 'Failed to create barcode' }, 500);
  }
});

// Update barcode
router.put('/:id', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const body = await c.req.json();
    const { code, type, description, fk_lot_in, fk_lot_out, fk_package } = body;
    const barcodeId = c.req.param('id');

    // Validate required fields
    if (!code || !type) {
      return c.json({ error: 'Code and type are required' }, 400);
    }

    // Check if barcode exists
    const existingBarcode = await database.getRow('SELECT id FROM barcode WHERE id = ?', [barcodeId]);
    if (!existingBarcode) {
      return c.json({ error: 'Barcode not found' }, 404);
    }

    // Check if code already exists for another barcode
    const duplicateCode = await database.getRow('SELECT id FROM barcode WHERE code = ? AND id != ?', [code, barcodeId]);
    if (duplicateCode) {
      return c.json({ error: 'Barcode code already exists' }, 400);
    }

    // Validate that at least one reference is provided
    if (!fk_lot_in && !fk_lot_out && !fk_package) {
      return c.json({ error: 'At least one reference (lot_in, lot_out, or package) must be provided' }, 400);
    }

    // Check if lot_in exists (if provided)
    if (fk_lot_in) {
      const lotIn = await database.getRow('SELECT id FROM lot_in WHERE id = ?', [fk_lot_in]);
      if (!lotIn) {
        return c.json({ error: 'Incoming lot not found' }, 400);
      }
    }

    // Check if lot_out exists (if provided)
    if (fk_lot_out) {
      const lotOut = await database.getRow('SELECT id FROM lot_out WHERE id = ?', [fk_lot_out]);
      if (!lotOut) {
        return c.json({ error: 'Outgoing lot not found' }, 400);
      }
    }

    // Check if package exists (if provided)
    if (fk_package) {
      const packageItem = await database.getRow('SELECT id FROM package WHERE id = ?', [fk_package]);
      if (!packageItem) {
        return c.json({ error: 'Package not found' }, 400);
      }
    }

    await database.runQuery(
      'UPDATE barcode SET code = ?, type = ?, description = ?, fk_lot_in = ?, fk_lot_out = ?, fk_package = ? WHERE id = ?',
      [code, type, description || null, fk_lot_in || null, fk_lot_out || null, fk_package || null, barcodeId]
    );

    const updatedBarcode = await database.getRow(`
      SELECT 
        b.*,
        li.lot_number as lot_in_number,
        lo.lot_number as lot_out_number,
        p.description as package_description
      FROM barcode b
      LEFT JOIN lot_in li ON b.fk_lot_in = li.id
      LEFT JOIN lot_out lo ON b.fk_lot_out = lo.id
      LEFT JOIN package p ON b.fk_package = p.id
      WHERE b.id = ?
    `, [barcodeId]);
    
    return c.json(updatedBarcode);
  } catch (error) {
    console.error('Error updating barcode:', error);
    return c.json({ error: 'Failed to update barcode' }, 500);
  }
});

// Delete barcode
router.delete('/:id', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const barcodeId = c.req.param('id');

    // Check if barcode exists
    const existingBarcode = await database.getRow('SELECT id FROM barcode WHERE id = ?', [barcodeId]);
    if (!existingBarcode) {
      return c.json({ error: 'Barcode not found' }, 404);
    }

    await database.runQuery('DELETE FROM barcode WHERE id = ?', [barcodeId]);
    return c.json({ message: 'Barcode deleted successfully' });
  } catch (error) {
    console.error('Error deleting barcode:', error);
    return c.json({ error: 'Failed to delete barcode' }, 500);
  }
});

// Get barcodes statistics for dashboard
router.get('/stats/summary', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    // Get total barcodes count
    const totalBarcodesResult = await database.getRow('SELECT COUNT(*) as count FROM barcode');
    const totalBarcodes = totalBarcodesResult.count || 0;
    
    // Get barcodes by type count
    const barcodesByTypeResult = await database.getAll('SELECT type, COUNT(*) as count FROM barcode GROUP BY type');
    const barcodesByType = barcodesByTypeResult || [];
    
    // Get barcodes by reference type count
    const lotInBarcodesResult = await database.getRow('SELECT COUNT(*) as count FROM barcode WHERE fk_lot_in IS NOT NULL');
    const lotInBarcodes = lotInBarcodesResult.count || 0;
    
    const lotOutBarcodesResult = await database.getRow('SELECT COUNT(*) as count FROM barcode WHERE fk_lot_out IS NOT NULL');
    const lotOutBarcodes = lotOutBarcodesResult.count || 0;
    
    const packageBarcodesResult = await database.getRow('SELECT COUNT(*) as count FROM barcode WHERE fk_package IS NOT NULL');
    const packageBarcodes = packageBarcodesResult.count || 0;
    
    return c.json({
      totalBarcodes,
      barcodesByType,
      lotInBarcodes,
      lotOutBarcodes,
      packageBarcodes
    });
  } catch (error) {
    console.error('Error fetching barcodes stats:', error);
    return c.json({ error: 'Failed to fetch barcodes statistics' }, 500);
  }
});

export default router; 