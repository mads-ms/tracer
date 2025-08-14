import { Hono } from 'hono';

const router = new Hono();

// Get all suppliers
router.get('/', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const suppliers = await database.getAll('SELECT * FROM supplier ORDER BY name');
    return c.json(suppliers);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return c.json({ error: 'Failed to fetch suppliers' }, 500);
  }
});

// Get supplier by ID
router.get('/:id', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const supplier = await database.getRow('SELECT * FROM supplier WHERE id = ?', [c.req.param('id')]);
    if (!supplier) {
      return c.json({ error: 'Supplier not found' }, 404);
    }
    return c.json(supplier);
  } catch (error) {
    console.error('Error fetching supplier:', error);
    return c.json({ error: 'Failed to fetch supplier' }, 500);
  }
});

// Create new supplier
router.post('/', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const body = await c.req.json();
    const { vat, name, address, city, country, phone, email, website } = body;
    
    // Validate required fields
    if (!vat || !name) {
      return c.json({ error: 'VAT and name are required' }, 400);
    }

    // Check if VAT already exists
    const existingSupplier = await database.getRow('SELECT id FROM supplier WHERE vat = ?', [vat]);
    if (existingSupplier) {
      return c.json({ error: 'Supplier with this VAT already exists' }, 400);
    }

    const result = await database.runQuery(
      'INSERT INTO supplier (vat, name, address, city, country, phone, email, website) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [vat, name, address || null, city || null, country || null, phone || null, email || null, website || null]
    );

    // Check if we got a valid result
    if (!result || !result.id) {
      // If we can't get the ID, try to fetch the supplier by VAT and name
      const newSupplier = await database.getRow(
        'SELECT * FROM supplier WHERE vat = ? AND name = ? ORDER BY created_at DESC LIMIT 1',
        [vat, name]
      );
      if (newSupplier) {
        return c.json(newSupplier, 201);
      } else {
        return c.json({ 
          message: 'Supplier created successfully but could not retrieve details',
          success: true 
        }, 201);
      }
    }

    const newSupplier = await database.getRow('SELECT * FROM supplier WHERE id = ?', [result.id]);
    return c.json(newSupplier, 201);
  } catch (error) {
    console.error('Error creating supplier:', error);
    return c.json({ error: 'Failed to create supplier' }, 500);
  }
});

// Update supplier
router.put('/:id', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const body = await c.req.json();
    const { vat, name, address, city, country, phone, email, website } = body;
    const supplierId = c.req.param('id');

    // Validate required fields
    if (!vat || !name) {
      return c.json({ error: 'VAT and name are required' }, 400);
    }

    // Check if supplier exists
    const existingSupplier = await database.getRow('SELECT id FROM supplier WHERE id = ?', [supplierId]);
    if (!existingSupplier) {
      return c.json({ error: 'Supplier not found' }, 404);
    }

    // Check if VAT already exists for another supplier
    const duplicateVat = await database.getRow('SELECT id FROM supplier WHERE vat = ? AND id != ?', [vat, supplierId]);
    if (duplicateVat) {
      return c.json({ error: 'Supplier with this VAT already exists' }, 400);
    }

    await database.runQuery(
      'UPDATE supplier SET vat = ?, name = ?, address = ?, city = ?, country = ?, phone = ?, email = ?, website = ? WHERE id = ?',
      [vat, name, address || null, city || null, country || null, phone || null, email || null, website || null, supplierId]
    );

    const updatedSupplier = await database.getRow('SELECT * FROM supplier WHERE id = ?', [supplierId]);
    return c.json(updatedSupplier);
  } catch (error) {
    console.error('Error updating supplier:', error);
    return c.json({ error: 'Failed to update supplier' }, 500);
  }
});

// Delete supplier
router.delete('/:id', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const supplierId = c.req.param('id');

    // Check if supplier exists
    const existingSupplier = await database.getRow('SELECT id FROM supplier WHERE id = ?', [supplierId]);
    if (!existingSupplier) {
      return c.json({ error: 'Supplier not found' }, 404);
    }

    // Check if supplier is referenced in lots
    const referencedInLots = await database.getRow('SELECT id FROM lot_in WHERE supplier_id = ? LIMIT 1', [supplierId]);
    if (referencedInLots) {
      return c.json({ error: 'Cannot delete supplier: referenced in incoming lots' }, 400);
    }

    await database.runQuery('DELETE FROM supplier WHERE id = ?', [supplierId]);
    return c.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return c.json({ error: 'Failed to delete supplier' }, 500);
  }
});

// Get supplier statistics for dashboard
router.get('/stats/summary', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    // Get total suppliers count
    const totalSuppliersResult = await database.getRow('SELECT COUNT(*) as count FROM supplier');
    const totalSuppliers = totalSuppliersResult.count || 0;
    
    // Get suppliers with lots count
    const suppliersWithLotsResult = await database.getRow('SELECT COUNT(DISTINCT supplier_id) as count FROM lot_in WHERE supplier_id IS NOT NULL');
    const suppliersWithLots = suppliersWithLotsResult.count || 0;
    
    return c.json({
      totalSuppliers,
      suppliersWithLots,
      suppliersWithoutLots: totalSuppliers - suppliersWithLots
    });
  } catch (error) {
    console.error('Error fetching supplier stats:', error);
    return c.json({ error: 'Failed to fetch supplier statistics' }, 500);
  }
});

export default router; 