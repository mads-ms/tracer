import { Hono } from 'hono';

const router = new Hono();

// Get all packages
router.get('/', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const packages = await database.getAll('SELECT * FROM package ORDER BY description');
    return c.json(packages);
  } catch (error) {
    console.error('Error fetching packages:', error);
    return c.json({ error: 'Failed to fetch packages' }, 500);
  }
});

// Get package by ID
router.get('/:id', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const packageItem = await database.getRow('SELECT * FROM package WHERE id = ?', [c.req.param('id')]);
    if (!packageItem) {
      return c.json({ error: 'Package not found' }, 404);
    }
    return c.json(packageItem);
  } catch (error) {
    console.error('Error fetching package:', error);
    return c.json({ error: 'Failed to fetch package' }, 500);
  }
});

// Create new package
router.post('/', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const body = await c.req.json();
    const { type, description, measure, more_information, variable, fk_gtin } = body;
    
    // Validate required fields
    if (!type || !description || !measure) {
      return c.json({ error: 'Type, description, and measure are required' }, 400);
    }

    const result = await database.runQuery(
      'INSERT INTO package (type, description, measure, more_information, variable, fk_gtin) VALUES (?, ?, ?, ?, ?, ?)',
      [type, description, measure, more_information || 0, variable || 0, fk_gtin || null]
    );

    // Check if we got a valid result
    if (!result || !result.id) {
      // If we can't get the ID, try to fetch the package by description and type
      const newPackage = await database.getRow(
        'SELECT * FROM package WHERE type = ? AND description = ? ORDER BY created_at DESC LIMIT 1',
        [type, description]
      );
      if (newPackage) {
        return c.json(newPackage, 201);
      } else {
        return c.json({ 
          message: 'Package created successfully but could not retrieve details',
          success: true 
        }, 201);
      }
    }

    const newPackage = await database.getRow('SELECT * FROM package WHERE id = ?', [result.id]);
    return c.json(newPackage, 201);
  } catch (error) {
    console.error('Error creating package:', error);
    return c.json({ error: 'Failed to create package' }, 500);
  }
});

// Update package
router.put('/:id', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const body = await c.req.json();
    const { type, description, measure, more_information, variable, fk_gtin } = body;
    const packageId = c.req.param('id');

    // Validate required fields
    if (!type || !description || !measure) {
      return c.json({ error: 'Type, description, and measure are required' }, 400);
    }

    // Check if package exists
    const existingPackage = await database.getRow('SELECT id FROM package WHERE id = ?', [packageId]);
    if (!existingPackage) {
      return c.json({ error: 'Package not found' }, 404);
    }

    await database.runQuery(
      'UPDATE package SET type = ?, description = ?, measure = ?, more_information = ?, variable = ?, fk_gtin = ? WHERE id = ?',
      [type, description, measure, more_information || 0, variable || 0, fk_gtin || null, packageId]
    );

    const updatedPackage = await database.getRow('SELECT * FROM package WHERE id = ?', [packageId]);
    return c.json(updatedPackage);
  } catch (error) {
    console.error('Error updating package:', error);
    return c.json({ error: 'Failed to update package' }, 500);
  }
});

// Delete package
router.delete('/:id', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const packageId = c.req.param('id');

    // Check if package exists
    const existingPackage = await database.getRow('SELECT id FROM package WHERE id = ?', [packageId]);
    if (!existingPackage) {
      return c.json({ error: 'Package not found' }, 404);
    }

    // Check if package is referenced in sales
    const referencedInSales = await database.getRow('SELECT id FROM sell WHERE fk_package = ? LIMIT 1', [packageId]);
    if (referencedInSales) {
      return c.json({ error: 'Cannot delete package: referenced in sales' }, 400);
    }

    await database.runQuery('DELETE FROM package WHERE id = ?', [packageId]);
    return c.json({ message: 'Package deleted successfully' });
  } catch (error) {
    console.error('Error deleting package:', error);
    return c.json({ error: 'Failed to delete package' }, 500);
  }
});

// Get packages statistics for dashboard
router.get('/stats/summary', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    // Get total packages count
    const totalPackagesResult = await database.getRow('SELECT COUNT(*) as count FROM package');
    const totalPackages = totalPackagesResult.count || 0;
    
    // Get packages by type count
    const packagesByTypeResult = await database.getAll('SELECT type, COUNT(*) as count FROM package GROUP BY type');
    const packagesByType = packagesByTypeResult || [];
    
    // Get packages with GTIN count
    const packagesWithGtinResult = await database.getRow('SELECT COUNT(*) as count FROM package WHERE fk_gtin IS NOT NULL');
    const packagesWithGtin = packagesWithGtinResult.count || 0;
    
    return c.json({
      totalPackages,
      packagesByType,
      packagesWithGtin
    });
  } catch (error) {
    console.error('Error fetching packages stats:', error);
    return c.json({ error: 'Failed to fetch packages statistics' }, 500);
  }
});

export default router; 