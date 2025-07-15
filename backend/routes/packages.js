const express = require('express');
const router = express.Router();
const { runQuery, getRow, getAll } = require('../database/database');

// Get all packages with GTIN details
router.get('/', async (req, res) => {
  try {
    const packages = await getAll(`
      SELECT 
        p.*,
        g.code as gtin_code,
        g.progressive
      FROM package p
      LEFT JOIN gtin_13 g ON p.fk_gtin = g.id
      ORDER BY p.type ASC, p.description ASC
    `);
    res.json(packages);
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

// Get package by ID
router.get('/:id', async (req, res) => {
  try {
    const package = await getRow(`
      SELECT 
        p.*,
        g.code as gtin_code,
        g.progressive
      FROM package p
      LEFT JOIN gtin_13 g ON p.fk_gtin = g.id
      WHERE p.id = ?
    `, [req.params.id]);
    
    if (!package) {
      return res.status(404).json({ error: 'Package not found' });
    }
    
    res.json(package);
  } catch (error) {
    console.error('Error fetching package:', error);
    res.status(500).json({ error: 'Failed to fetch package' });
  }
});

// Create new package
router.post('/', async (req, res) => {
  try {
    const {
      type,
      description,
      measure,
      more_information,
      variable,
      fk_gtin
    } = req.body;
    
    // Validation
    if (!type || !description || !measure) {
      return res.status(400).json({ 
        error: 'Required fields: type, description, measure' 
      });
    }
    
    // Check if GTIN exists (if provided)
    if (fk_gtin) {
      const gtin = await getRow(
        'SELECT id FROM gtin_13 WHERE id = ?',
        [fk_gtin]
      );
      
      if (!gtin) {
        return res.status(400).json({ error: 'GTIN not found' });
      }
    }
    
    const result = await runQuery(
      `INSERT INTO package (
        type, description, measure, more_information, variable, fk_gtin
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [type, description, measure, more_information || 0, variable || 0, fk_gtin || null]
    );
    
    const newPackage = await getRow(`
      SELECT 
        p.*,
        g.code as gtin_code,
        g.progressive
      FROM package p
      LEFT JOIN gtin_13 g ON p.fk_gtin = g.id
      WHERE p.id = ?
    `, [result.lastID]);
    
    res.status(201).json(newPackage);
  } catch (error) {
    console.error('Error creating package:', error);
    res.status(500).json({ error: 'Failed to create package' });
  }
});

// Update package
router.put('/:id', async (req, res) => {
  try {
    const {
      type,
      description,
      measure,
      more_information,
      variable,
      fk_gtin
    } = req.body;
    const packageId = req.params.id;
    
    // Validation
    if (!type || !description || !measure) {
      return res.status(400).json({ 
        error: 'Required fields: type, description, measure' 
      });
    }
    
    // Check if package exists
    const existingPackage = await getRow(
      'SELECT id FROM package WHERE id = ?',
      [packageId]
    );
    
    if (!existingPackage) {
      return res.status(404).json({ error: 'Package not found' });
    }
    
    // Check if GTIN exists (if provided)
    if (fk_gtin) {
      const gtin = await getRow(
        'SELECT id FROM gtin_13 WHERE id = ?',
        [fk_gtin]
      );
      
      if (!gtin) {
        return res.status(400).json({ error: 'GTIN not found' });
      }
    }
    
    await runQuery(
      `UPDATE package SET 
        type = ?, description = ?, measure = ?, more_information = ?,
        variable = ?, fk_gtin = ?
       WHERE id = ?`,
      [type, description, measure, more_information || 0, variable || 0, fk_gtin || null, packageId]
    );
    
    const updatedPackage = await getRow(`
      SELECT 
        p.*,
        g.code as gtin_code,
        g.progressive
      FROM package p
      LEFT JOIN gtin_13 g ON p.fk_gtin = g.id
      WHERE p.id = ?
    `, [packageId]);
    
    res.json(updatedPackage);
  } catch (error) {
    console.error('Error updating package:', error);
    res.status(500).json({ error: 'Failed to update package' });
  }
});

// Delete package
router.delete('/:id', async (req, res) => {
  try {
    const packageId = req.params.id;
    
    // Check if package exists
    const existingPackage = await getRow(
      'SELECT id FROM package WHERE id = ?',
      [packageId]
    );
    
    if (!existingPackage) {
      return res.status(404).json({ error: 'Package not found' });
    }
    
    // Check if package is referenced in sales
    const salesCount = await getRow(
      'SELECT COUNT(*) as count FROM sell WHERE fk_package = ?',
      [packageId]
    );
    
    if (salesCount.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete package: it is referenced in sales' 
      });
    }
    
    // Check if package is referenced in food relationships
    const foodInCount = await getRow(
      'SELECT COUNT(*) as count FROM package_foodIn WHERE fk_package = ?',
      [packageId]
    );
    
    const foodOutCount = await getRow(
      'SELECT COUNT(*) as count FROM package_foodOut WHERE fk_package = ?',
      [packageId]
    );
    
    if (foodInCount.count > 0 || foodOutCount.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete package: it has associated food relationships' 
      });
    }
    
    await runQuery('DELETE FROM package WHERE id = ?', [packageId]);
    
    res.json({ message: 'Package deleted successfully' });
  } catch (error) {
    console.error('Error deleting package:', error);
    res.status(500).json({ error: 'Failed to delete package' });
  }
});

// Search packages
router.get('/search/:query', async (req, res) => {
  try {
    const query = `%${req.params.query}%`;
    const packages = await getAll(`
      SELECT 
        p.*,
        g.code as gtin_code,
        g.progressive
      FROM package p
      LEFT JOIN gtin_13 g ON p.fk_gtin = g.id
      WHERE p.type LIKE ? OR p.description LIKE ? OR p.measure LIKE ?
      ORDER BY p.type ASC, p.description ASC
    `, [query, query, query]);
    
    res.json(packages);
  } catch (error) {
    console.error('Error searching packages:', error);
    res.status(500).json({ error: 'Failed to search packages' });
  }
});

// Get packages by type
router.get('/type/:type', async (req, res) => {
  try {
    const type = req.params.type;
    
    const packages = await getAll(`
      SELECT 
        p.*,
        g.code as gtin_code,
        g.progressive
      FROM package p
      LEFT JOIN gtin_13 g ON p.fk_gtin = g.id
      WHERE p.type = ?
      ORDER BY p.description ASC
    `, [type]);
    
    res.json(packages);
  } catch (error) {
    console.error('Error fetching packages by type:', error);
    res.status(500).json({ error: 'Failed to fetch packages by type' });
  }
});

// Get package types
router.get('/types/list', async (req, res) => {
  try {
    const types = await getAll(`
      SELECT DISTINCT type 
      FROM package 
      ORDER BY type ASC
    `);
    
    res.json(types.map(t => t.type));
  } catch (error) {
    console.error('Error fetching package types:', error);
    res.status(500).json({ error: 'Failed to fetch package types' });
  }
});

// Get package food relationships
router.get('/:id/foods', async (req, res) => {
  try {
    const packageId = req.params.id;
    
    // Check if package exists
    const package = await getRow(
      'SELECT id FROM package WHERE id = ?',
      [packageId]
    );
    
    if (!package) {
      return res.status(404).json({ error: 'Package not found' });
    }
    
    // Get raw food relationships
    const rawFoods = await getAll(`
      SELECT 
        pfi.*,
        fi.name as food_name,
        fi.unit_measure,
        fi.source
      FROM package_foodIn pfi
      LEFT JOIN food_in fi ON pfi.fk_food_in = fi.id
      WHERE pfi.fk_package = ?
      ORDER BY fi.name ASC
    `, [packageId]);
    
    // Get processed food relationships
    const processedFoods = await getAll(`
      SELECT 
        pfo.*,
        fo.name as food_name,
        fo.unit_measure,
        g.code as gtin_code
      FROM package_foodOut pfo
      LEFT JOIN food_out fo ON pfo.fk_food_out = fo.id
      LEFT JOIN gtin_13 g ON fo.fk_gtin = g.id
      WHERE pfo.fk_package = ?
      ORDER BY fo.name ASC
    `, [packageId]);
    
    res.json({
      rawFoods,
      processedFoods,
      total: rawFoods.length + processedFoods.length
    });
  } catch (error) {
    console.error('Error fetching package foods:', error);
    res.status(500).json({ error: 'Failed to fetch package foods' });
  }
});

// Add raw food to package
router.post('/:id/foods/raw', async (req, res) => {
  try {
    const packageId = req.params.id;
    const { fk_food_in } = req.body;
    
    if (!fk_food_in) {
      return res.status(400).json({ error: 'Food ID is required' });
    }
    
    // Check if package exists
    const package = await getRow(
      'SELECT id FROM package WHERE id = ?',
      [packageId]
    );
    
    if (!package) {
      return res.status(404).json({ error: 'Package not found' });
    }
    
    // Check if food exists
    const food = await getRow(
      'SELECT id FROM food_in WHERE id = ?',
      [fk_food_in]
    );
    
    if (!food) {
      return res.status(404).json({ error: 'Raw food not found' });
    }
    
    // Check if relationship already exists
    const existingRelationship = await getRow(
      'SELECT id FROM package_foodIn WHERE fk_package = ? AND fk_food_in = ?',
      [packageId, fk_food_in]
    );
    
    if (existingRelationship) {
      return res.status(400).json({ error: 'Food is already associated with this package' });
    }
    
    await runQuery(
      'INSERT INTO package_foodIn (fk_package, fk_food_in) VALUES (?, ?)',
      [packageId, fk_food_in]
    );
    
    res.status(201).json({ message: 'Raw food added to package successfully' });
  } catch (error) {
    console.error('Error adding raw food to package:', error);
    res.status(500).json({ error: 'Failed to add raw food to package' });
  }
});

// Add processed food to package
router.post('/:id/foods/processed', async (req, res) => {
  try {
    const packageId = req.params.id;
    const { fk_food_out } = req.body;
    
    if (!fk_food_out) {
      return res.status(400).json({ error: 'Food ID is required' });
    }
    
    // Check if package exists
    const package = await getRow(
      'SELECT id FROM package WHERE id = ?',
      [packageId]
    );
    
    if (!package) {
      return res.status(404).json({ error: 'Package not found' });
    }
    
    // Check if food exists
    const food = await getRow(
      'SELECT id FROM food_out WHERE id = ?',
      [fk_food_out]
    );
    
    if (!food) {
      return res.status(404).json({ error: 'Processed food not found' });
    }
    
    // Check if relationship already exists
    const existingRelationship = await getRow(
      'SELECT id FROM package_foodOut WHERE fk_package = ? AND fk_food_out = ?',
      [packageId, fk_food_out]
    );
    
    if (existingRelationship) {
      return res.status(400).json({ error: 'Food is already associated with this package' });
    }
    
    await runQuery(
      'INSERT INTO package_foodOut (fk_package, fk_food_out) VALUES (?, ?)',
      [packageId, fk_food_out]
    );
    
    res.status(201).json({ message: 'Processed food added to package successfully' });
  } catch (error) {
    console.error('Error adding processed food to package:', error);
    res.status(500).json({ error: 'Failed to add processed food to package' });
  }
});

// Remove raw food from package
router.delete('/:packageId/foods/raw/:foodId', async (req, res) => {
  try {
    const { packageId, foodId } = req.params;
    
    await runQuery(
      'DELETE FROM package_foodIn WHERE fk_package = ? AND fk_food_in = ?',
      [packageId, foodId]
    );
    
    res.json({ message: 'Raw food removed from package successfully' });
  } catch (error) {
    console.error('Error removing raw food from package:', error);
    res.status(500).json({ error: 'Failed to remove raw food from package' });
  }
});

// Remove processed food from package
router.delete('/:packageId/foods/processed/:foodId', async (req, res) => {
  try {
    const { packageId, foodId } = req.params;
    
    await runQuery(
      'DELETE FROM package_foodOut WHERE fk_package = ? AND fk_food_out = ?',
      [packageId, foodId]
    );
    
    res.json({ message: 'Processed food removed from package successfully' });
  } catch (error) {
    console.error('Error removing processed food from package:', error);
    res.status(500).json({ error: 'Failed to remove processed food from package' });
  }
});

// Get package statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const totalPackages = await getRow('SELECT COUNT(*) as count FROM package');
    const packagesWithGTIN = await getRow('SELECT COUNT(*) as count FROM package WHERE fk_gtin IS NOT NULL');
    const packageTypes = await getRow('SELECT COUNT(DISTINCT type) as count FROM package');
    
    res.json({
      totalPackages: totalPackages.count,
      packagesWithGTIN: packagesWithGTIN.count,
      packageTypes: packageTypes.count
    });
  } catch (error) {
    console.error('Error fetching package statistics:', error);
    res.status(500).json({ error: 'Failed to fetch package statistics' });
  }
});

module.exports = router; 