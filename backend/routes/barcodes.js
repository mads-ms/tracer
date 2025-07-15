const express = require('express');
const router = express.Router();
const { runQuery, getRow, getAll } = require('../database/database');

// Get all GTIN codes
router.get('/', async (req, res) => {
  try {
    const gtinCodes = await getAll(`
      SELECT 
        g.*,
        COUNT(DISTINCT fo.id) as food_count,
        COUNT(DISTINCT p.id) as package_count
      FROM gtin_13 g
      LEFT JOIN food_out fo ON g.id = fo.fk_gtin
      LEFT JOIN package p ON g.id = p.fk_gtin
      GROUP BY g.id, g.code, g.progressive
      ORDER BY g.code ASC
    `);
    res.json(gtinCodes);
  } catch (error) {
    console.error('Error fetching GTIN codes:', error);
    res.status(500).json({ error: 'Failed to fetch GTIN codes' });
  }
});

// Get GTIN by ID
router.get('/:id', async (req, res) => {
  try {
    const gtin = await getRow(`
      SELECT 
        g.*,
        COUNT(DISTINCT fo.id) as food_count,
        COUNT(DISTINCT p.id) as package_count
      FROM gtin_13 g
      LEFT JOIN food_out fo ON g.id = fo.fk_gtin
      LEFT JOIN package p ON g.id = p.fk_gtin
      WHERE g.id = ?
      GROUP BY g.id, g.code, g.progressive
    `, [req.params.id]);
    
    if (!gtin) {
      return res.status(404).json({ error: 'GTIN not found' });
    }
    
    res.json(gtin);
  } catch (error) {
    console.error('Error fetching GTIN:', error);
    res.status(500).json({ error: 'Failed to fetch GTIN' });
  }
});

// Create new GTIN
router.post('/', async (req, res) => {
  try {
    const { code, progressive } = req.body;
    
    // Validation
    if (!code) {
      return res.status(400).json({ error: 'GTIN code is required' });
    }
    
    // Validate GTIN format (13 digits)
    if (!/^\d{13}$/.test(code)) {
      return res.status(400).json({ error: 'GTIN must be exactly 13 digits' });
    }
    
    // Check if GTIN already exists
    const existingGtin = await getRow(
      'SELECT id FROM gtin_13 WHERE code = ?',
      [code]
    );
    
    if (existingGtin) {
      return res.status(400).json({ error: 'GTIN code already exists' });
    }
    
    const result = await runQuery(
      'INSERT INTO gtin_13 (code, progressive) VALUES (?, ?)',
      [code, progressive || 0]
    );
    
    const newGtin = await getRow(`
      SELECT 
        g.*,
        COUNT(DISTINCT fo.id) as food_count,
        COUNT(DISTINCT p.id) as package_count
      FROM gtin_13 g
      LEFT JOIN food_out fo ON g.id = fo.fk_gtin
      LEFT JOIN package p ON g.id = p.fk_gtin
      WHERE g.id = ?
      GROUP BY g.id, g.code, g.progressive
    `, [result.lastID]);
    
    res.status(201).json(newGtin);
  } catch (error) {
    console.error('Error creating GTIN:', error);
    res.status(500).json({ error: 'Failed to create GTIN' });
  }
});

// Update GTIN
router.put('/:id', async (req, res) => {
  try {
    const { code, progressive } = req.body;
    const gtinId = req.params.id;
    
    // Validation
    if (!code) {
      return res.status(400).json({ error: 'GTIN code is required' });
    }
    
    // Validate GTIN format (13 digits)
    if (!/^\d{13}$/.test(code)) {
      return res.status(400).json({ error: 'GTIN must be exactly 13 digits' });
    }
    
    // Check if GTIN exists
    const existingGtin = await getRow(
      'SELECT id FROM gtin_13 WHERE id = ?',
      [gtinId]
    );
    
    if (!existingGtin) {
      return res.status(404).json({ error: 'GTIN not found' });
    }
    
    // Check if new code already exists for another GTIN
    const duplicateCode = await getRow(
      'SELECT id FROM gtin_13 WHERE code = ? AND id != ?',
      [code, gtinId]
    );
    
    if (duplicateCode) {
      return res.status(400).json({ error: 'GTIN code already exists' });
    }
    
    await runQuery(
      'UPDATE gtin_13 SET code = ?, progressive = ? WHERE id = ?',
      [code, progressive || 0, gtinId]
    );
    
    const updatedGtin = await getRow(`
      SELECT 
        g.*,
        COUNT(DISTINCT fo.id) as food_count,
        COUNT(DISTINCT p.id) as package_count
      FROM gtin_13 g
      LEFT JOIN food_out fo ON g.id = fo.fk_gtin
      LEFT JOIN package p ON g.id = p.fk_gtin
      WHERE g.id = ?
      GROUP BY g.id, g.code, g.progressive
    `, [gtinId]);
    
    res.json(updatedGtin);
  } catch (error) {
    console.error('Error updating GTIN:', error);
    res.status(500).json({ error: 'Failed to update GTIN' });
  }
});

// Delete GTIN
router.delete('/:id', async (req, res) => {
  try {
    const gtinId = req.params.id;
    
    // Check if GTIN exists
    const existingGtin = await getRow(
      'SELECT id FROM gtin_13 WHERE id = ?',
      [gtinId]
    );
    
    if (!existingGtin) {
      return res.status(404).json({ error: 'GTIN not found' });
    }
    
    // Check if GTIN is referenced in foods
    const foodCount = await getRow(
      'SELECT COUNT(*) as count FROM food_out WHERE fk_gtin = ?',
      [gtinId]
    );
    
    // Check if GTIN is referenced in packages
    const packageCount = await getRow(
      'SELECT COUNT(*) as count FROM package WHERE fk_gtin = ?',
      [gtinId]
    );
    
    if (foodCount.count > 0 || packageCount.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete GTIN: it is referenced in foods or packages' 
      });
    }
    
    await runQuery('DELETE FROM gtin_13 WHERE id = ?', [gtinId]);
    
    res.json({ message: 'GTIN deleted successfully' });
  } catch (error) {
    console.error('Error deleting GTIN:', error);
    res.status(500).json({ error: 'Failed to delete GTIN' });
  }
});

// Search GTIN codes
router.get('/search/:query', async (req, res) => {
  try {
    const query = `%${req.params.query}%`;
    const gtinCodes = await getAll(`
      SELECT 
        g.*,
        COUNT(DISTINCT fo.id) as food_count,
        COUNT(DISTINCT p.id) as package_count
      FROM gtin_13 g
      LEFT JOIN food_out fo ON g.id = fo.fk_gtin
      LEFT JOIN package p ON g.id = p.fk_gtin
      WHERE g.code LIKE ?
      GROUP BY g.id, g.code, g.progressive
      ORDER BY g.code ASC
    `, [query]);
    
    res.json(gtinCodes);
  } catch (error) {
    console.error('Error searching GTIN codes:', error);
    res.status(500).json({ error: 'Failed to search GTIN codes' });
  }
});

// Get GTIN by code
router.get('/code/:code', async (req, res) => {
  try {
    const code = req.params.code;
    
    const gtin = await getRow(`
      SELECT 
        g.*,
        COUNT(DISTINCT fo.id) as food_count,
        COUNT(DISTINCT p.id) as package_count
      FROM gtin_13 g
      LEFT JOIN food_out fo ON g.id = fo.fk_gtin
      LEFT JOIN package p ON g.id = p.fk_gtin
      WHERE g.code = ?
      GROUP BY g.id, g.code, g.progressive
    `, [code]);
    
    if (!gtin) {
      return res.status(404).json({ error: 'GTIN not found' });
    }
    
    res.json(gtin);
  } catch (error) {
    console.error('Error fetching GTIN by code:', error);
    res.status(500).json({ error: 'Failed to fetch GTIN by code' });
  }
});

// Get foods associated with GTIN
router.get('/:id/foods', async (req, res) => {
  try {
    const gtinId = req.params.id;
    
    // Check if GTIN exists
    const gtin = await getRow(
      'SELECT id FROM gtin_13 WHERE id = ?',
      [gtinId]
    );
    
    if (!gtin) {
      return res.status(404).json({ error: 'GTIN not found' });
    }
    
    const foods = await getAll(`
      SELECT 
        fo.*,
        g.code as gtin_code,
        g.progressive
      FROM food_out fo
      LEFT JOIN gtin_13 g ON fo.fk_gtin = g.id
      WHERE fo.fk_gtin = ?
      ORDER BY fo.name ASC
    `, [gtinId]);
    
    res.json(foods);
  } catch (error) {
    console.error('Error fetching GTIN foods:', error);
    res.status(500).json({ error: 'Failed to fetch GTIN foods' });
  }
});

// Get packages associated with GTIN
router.get('/:id/packages', async (req, res) => {
  try {
    const gtinId = req.params.id;
    
    // Check if GTIN exists
    const gtin = await getRow(
      'SELECT id FROM gtin_13 WHERE id = ?',
      [gtinId]
    );
    
    if (!gtin) {
      return res.status(404).json({ error: 'GTIN not found' });
    }
    
    const packages = await getAll(`
      SELECT 
        p.*,
        g.code as gtin_code,
        g.progressive
      FROM package p
      LEFT JOIN gtin_13 g ON p.fk_gtin = g.id
      WHERE p.fk_gtin = ?
      ORDER BY p.type ASC, p.description ASC
    `, [gtinId]);
    
    res.json(packages);
  } catch (error) {
    console.error('Error fetching GTIN packages:', error);
    res.status(500).json({ error: 'Failed to fetch GTIN packages' });
  }
});

// Get lots associated with GTIN
router.get('/:id/lots', async (req, res) => {
  try {
    const gtinId = req.params.id;
    
    // Check if GTIN exists
    const gtin = await getRow(
      'SELECT id FROM gtin_13 WHERE id = ?',
      [gtinId]
    );
    
    if (!gtin) {
      return res.status(404).json({ error: 'GTIN not found' });
    }
    
    const lots = await getAll(`
      SELECT 
        lo.*,
        fo.name as food_name,
        fo.unit_measure,
        g.code as gtin_code,
        li.lot_number as source_lot_number,
        li.acceptance_date as source_acceptance_date,
        fi.name as source_food_name
      FROM lot_out lo
      LEFT JOIN food_out fo ON lo.fk_food_out = fo.id
      LEFT JOIN gtin_13 g ON fo.fk_gtin = g.id
      LEFT JOIN lot_in li ON lo.fk_lot_in = li.id
      LEFT JOIN food_in fi ON li.fk_food_in = fi.id
      WHERE fo.fk_gtin = ?
      ORDER BY lo.creation_date DESC
    `, [gtinId]);
    
    res.json(lots);
  } catch (error) {
    console.error('Error fetching GTIN lots:', error);
    res.status(500).json({ error: 'Failed to fetch GTIN lots' });
  }
});

// Get sales associated with GTIN
router.get('/:id/sales', async (req, res) => {
  try {
    const gtinId = req.params.id;
    
    // Check if GTIN exists
    const gtin = await getRow(
      'SELECT id FROM gtin_13 WHERE id = ?',
      [gtinId]
    );
    
    if (!gtin) {
      return res.status(404).json({ error: 'GTIN not found' });
    }
    
    const sales = await getAll(`
      SELECT 
        s.*,
        c.name as customer_name,
        c.vat as customer_vat,
        c.city as customer_city,
        lo.lot_number as lot_out_number,
        fo.name as lot_out_food_name,
        g.code as gtin_code
      FROM sell s
      LEFT JOIN customer c ON s.fk_customer = c.id
      LEFT JOIN lot_out lo ON s.fk_lot_out = lo.id
      LEFT JOIN food_out fo ON lo.fk_food_out = fo.id
      LEFT JOIN gtin_13 g ON fo.fk_gtin = g.id
      WHERE fo.fk_gtin = ?
      ORDER BY s.invoice_date DESC
    `, [gtinId]);
    
    res.json(sales);
  } catch (error) {
    console.error('Error fetching GTIN sales:', error);
    res.status(500).json({ error: 'Failed to fetch GTIN sales' });
  }
});

// Generate next GTIN code
router.get('/generate/next', async (req, res) => {
  try {
    const { prefix, startNumber = 1 } = req.query;
    
    if (!prefix) {
      return res.status(400).json({ error: 'Prefix is required' });
    }
    
    // Validate prefix format (should be 12 digits for GTIN-13)
    if (!/^\d{12}$/.test(prefix)) {
      return res.status(400).json({ error: 'Prefix must be exactly 12 digits' });
    }
    
    // Find the highest existing progressive number for this prefix
    const existingGtin = await getRow(`
      SELECT MAX(progressive) as max_progressive 
      FROM gtin_13 
      WHERE code LIKE ?
    `, [`${prefix}%`]);
    
    let nextNumber = startNumber;
    if (existingGtin && existingGtin.max_progressive) {
      nextNumber = Math.max(startNumber, existingGtin.max_progressive + 1);
    }
    
    // Generate the 13-digit GTIN code
    const gtinCode = prefix + (nextNumber % 10);
    
    // Calculate check digit (GTIN-13 algorithm)
    const checkDigit = calculateGTIN13CheckDigit(gtinCode);
    const fullGTIN = gtinCode + checkDigit;
    
    res.json({
      nextProgressive: nextNumber,
      gtinCode: fullGTIN,
      prefix,
      checkDigit
    });
  } catch (error) {
    console.error('Error generating next GTIN:', error);
    res.status(500).json({ error: 'Failed to generate next GTIN' });
  }
});

// Validate GTIN check digit
router.post('/validate', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'GTIN code is required' });
    }
    
    if (!/^\d{13}$/.test(code)) {
      return res.status(400).json({ 
        error: 'GTIN must be exactly 13 digits',
        valid: false 
      });
    }
    
    const providedCheckDigit = parseInt(code.charAt(12));
    const calculatedCheckDigit = calculateGTIN13CheckDigit(code.substring(0, 12));
    
    const isValid = providedCheckDigit === calculatedCheckDigit;
    
    res.json({
      code,
      providedCheckDigit,
      calculatedCheckDigit,
      valid: isValid
    });
  } catch (error) {
    console.error('Error validating GTIN:', error);
    res.status(500).json({ error: 'Failed to validate GTIN' });
  }
});

// Get GTIN statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const totalGTINs = await getRow('SELECT COUNT(*) as count FROM gtin_13');
    const gtinWithFoods = await getRow(`
      SELECT COUNT(DISTINCT fk_gtin) as count FROM food_out WHERE fk_gtin IS NOT NULL
    `);
    const gtinWithPackages = await getRow(`
      SELECT COUNT(DISTINCT fk_gtin) as count FROM package WHERE fk_gtin IS NOT NULL
    `);
    const unusedGTINs = await getRow(`
      SELECT COUNT(*) as count FROM gtin_13 g
      LEFT JOIN food_out fo ON g.id = fo.fk_gtin
      LEFT JOIN package p ON g.id = p.fk_gtin
      WHERE fo.id IS NULL AND p.id IS NULL
    `);
    
    res.json({
      totalGTINs: totalGTINs.count,
      gtinWithFoods: gtinWithFoods.count,
      gtinWithPackages: gtinWithPackages.count,
      unusedGTINs: unusedGTINs.count
    });
  } catch (error) {
    console.error('Error fetching GTIN statistics:', error);
    res.status(500).json({ error: 'Failed to fetch GTIN statistics' });
  }
});

// Bulk import GTIN codes
router.post('/bulk-import', async (req, res) => {
  try {
    const { gtinCodes } = req.body;
    
    if (!Array.isArray(gtinCodes) || gtinCodes.length === 0) {
      return res.status(400).json({ error: 'GTIN codes array is required' });
    }
    
    const results = {
      imported: 0,
      skipped: 0,
      errors: []
    };
    
    for (const gtinData of gtinCodes) {
      try {
        const { code, progressive = 0 } = gtinData;
        
        if (!code) {
          results.errors.push({ code: 'N/A', error: 'Code is required' });
          continue;
        }
        
        // Validate GTIN format
        if (!/^\d{13}$/.test(code)) {
          results.errors.push({ code, error: 'GTIN must be exactly 13 digits' });
          continue;
        }
        
        // Check if GTIN already exists
        const existingGtin = await getRow(
          'SELECT id FROM gtin_13 WHERE code = ?',
          [code]
        );
        
        if (existingGtin) {
          results.skipped++;
          continue;
        }
        
        // Insert new GTIN
        await runQuery(
          'INSERT INTO gtin_13 (code, progressive) VALUES (?, ?)',
          [code, progressive]
        );
        
        results.imported++;
      } catch (error) {
        results.errors.push({ 
          code: gtinData.code || 'N/A', 
          error: error.message 
        });
      }
    }
    
    res.json(results);
  } catch (error) {
    console.error('Error bulk importing GTIN codes:', error);
    res.status(500).json({ error: 'Failed to bulk import GTIN codes' });
  }
});

// Export GTIN codes
router.get('/export/:format', async (req, res) => {
  try {
    const format = req.params.format;
    
    if (!['json', 'csv'].includes(format)) {
      return res.status(400).json({ error: 'Export format must be "json" or "csv"' });
    }
    
    const gtinCodes = await getAll(`
      SELECT 
        g.*,
        COUNT(DISTINCT fo.id) as food_count,
        COUNT(DISTINCT p.id) as package_count
      FROM gtin_13 g
      LEFT JOIN food_out fo ON g.id = fo.fk_gtin
      LEFT JOIN package p ON g.id = p.fk_gtin
      GROUP BY g.id, g.code, g.progressive
      ORDER BY g.code ASC
    `);
    
    const exportData = {
      exportDate: new Date().toISOString(),
      gtinCodes
    };
    
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="gtin-codes-export.json"');
      res.json(exportData);
    } else if (format === 'csv') {
      const csvData = convertGTINToCSV(exportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="gtin-codes-export.csv"');
      res.send(csvData);
    }
  } catch (error) {
    console.error('Error exporting GTIN codes:', error);
    res.status(500).json({ error: 'Failed to export GTIN codes' });
  }
});

// Helper function to calculate GTIN-13 check digit
function calculateGTIN13CheckDigit(code12) {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code12.charAt(i));
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }
  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

// Helper function to convert GTIN data to CSV
function convertGTINToCSV(data) {
  const csvRows = [];
  
  // Add headers
  csvRows.push('Export Date: ' + data.exportDate);
  csvRows.push('');
  
  // GTIN Codes
  csvRows.push('GTIN CODES');
  csvRows.push('ID,Code,Progressive,Food Count,Package Count');
  
  data.gtinCodes.forEach(gtin => {
    csvRows.push([
      gtin.id,
      gtin.code,
      gtin.progressive,
      gtin.food_count,
      gtin.package_count
    ].join(','));
  });
  
  return csvRows.join('\n');
}

module.exports = router; 