const express = require('express');
const router = express.Router();
const { runQuery, getRow, getAll } = require('../database/database');

// Get all quality checks with lot and supplier details
router.get('/', async (req, res) => {
  try {
    const checks = await getAll(`
      SELECT 
        sc.*,
        li.lot_number,
        li.acceptance_date,
        li.ddt_number,
        s.name as supplier_name,
        s.vat as supplier_vat,
        fi.name as food_name
      FROM supply_check sc
      LEFT JOIN lot_in li ON sc.fk_lot_in = li.id
      LEFT JOIN supplier s ON li.fk_supplier = s.id
      LEFT JOIN food_in fi ON li.fk_food_in = fi.id
      ORDER BY sc.date DESC
    `);
    res.json(checks);
  } catch (error) {
    console.error('Error fetching quality checks:', error);
    res.status(500).json({ error: 'Failed to fetch quality checks' });
  }
});

// Get quality check by ID
router.get('/:id', async (req, res) => {
  try {
    const check = await getRow(`
      SELECT 
        sc.*,
        li.lot_number,
        li.acceptance_date,
        li.ddt_number,
        li.quantity,
        li.quantity_remaining,
        s.name as supplier_name,
        s.vat as supplier_vat,
        s.address as supplier_address,
        s.phone as supplier_phone,
        fi.name as food_name,
        fi.unit_measure,
        fi.source
      FROM supply_check sc
      LEFT JOIN lot_in li ON sc.fk_lot_in = li.id
      LEFT JOIN supplier s ON li.fk_supplier = s.id
      LEFT JOIN food_in fi ON li.fk_food_in = fi.id
      WHERE sc.id = ?
    `, [req.params.id]);
    
    if (!check) {
      return res.status(404).json({ error: 'Quality check not found' });
    }
    
    res.json(check);
  } catch (error) {
    console.error('Error fetching quality check:', error);
    res.status(500).json({ error: 'Failed to fetch quality check' });
  }
});

// Create new quality check
router.post('/', async (req, res) => {
  try {
    const {
      fk_lot_in,
      date,
      protocol,
      qt_controlled,
      qt_non_compliant,
      dim_calib
    } = req.body;
    
    // Validation
    if (!fk_lot_in || !date || !protocol || qt_controlled === undefined || 
        qt_non_compliant === undefined || !dim_calib) {
      return res.status(400).json({ 
        error: 'Required fields: fk_lot_in, date, protocol, qt_controlled, qt_non_compliant, dim_calib' 
      });
    }
    
    // Check if lot exists
    const lot = await getRow(
      'SELECT id FROM lot_in WHERE id = ?',
      [fk_lot_in]
    );
    
    if (!lot) {
      return res.status(400).json({ error: 'Incoming lot not found' });
    }
    
    // Check if protocol already exists
    const existingProtocol = await getRow(
      'SELECT id FROM supply_check WHERE protocol = ?',
      [protocol]
    );
    
    if (existingProtocol) {
      return res.status(400).json({ error: 'Protocol number already exists' });
    }
    
    // Validate quantities
    if (qt_controlled < 0 || qt_non_compliant < 0) {
      return res.status(400).json({ error: 'Quantities cannot be negative' });
    }
    
    if (qt_non_compliant > qt_controlled) {
      return res.status(400).json({ error: 'Non-compliant quantity cannot exceed controlled quantity' });
    }
    
    const result = await runQuery(
      `INSERT INTO supply_check (
        fk_lot_in, date, protocol, qt_controlled, qt_non_compliant, dim_calib
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [fk_lot_in, date, protocol, qt_controlled, qt_non_compliant, dim_calib]
    );
    
    const newCheck = await getRow(`
      SELECT 
        sc.*,
        li.lot_number,
        li.acceptance_date,
        li.ddt_number,
        s.name as supplier_name,
        s.vat as supplier_vat,
        fi.name as food_name
      FROM supply_check sc
      LEFT JOIN lot_in li ON sc.fk_lot_in = li.id
      LEFT JOIN supplier s ON li.fk_supplier = s.id
      LEFT JOIN food_in fi ON li.fk_food_in = fi.id
      WHERE sc.id = ?
    `, [result.lastID]);
    
    res.status(201).json(newCheck);
  } catch (error) {
    console.error('Error creating quality check:', error);
    res.status(500).json({ error: 'Failed to create quality check' });
  }
});

// Update quality check
router.put('/:id', async (req, res) => {
  try {
    const {
      fk_lot_in,
      date,
      protocol,
      qt_controlled,
      qt_non_compliant,
      dim_calib
    } = req.body;
    const checkId = req.params.id;
    
    // Validation
    if (!fk_lot_in || !date || !protocol || qt_controlled === undefined || 
        qt_non_compliant === undefined || !dim_calib) {
      return res.status(400).json({ 
        error: 'Required fields: fk_lot_in, date, protocol, qt_controlled, qt_non_compliant, dim_calib' 
      });
    }
    
    // Check if check exists
    const existingCheck = await getRow(
      'SELECT id FROM supply_check WHERE id = ?',
      [checkId]
    );
    
    if (!existingCheck) {
      return res.status(404).json({ error: 'Quality check not found' });
    }
    
    // Check if lot exists
    const lot = await getRow(
      'SELECT id FROM lot_in WHERE id = ?',
      [fk_lot_in]
    );
    
    if (!lot) {
      return res.status(400).json({ error: 'Incoming lot not found' });
    }
    
    // Check if protocol already exists for another check
    const duplicateProtocol = await getRow(
      'SELECT id FROM supply_check WHERE protocol = ? AND id != ?',
      [protocol, checkId]
    );
    
    if (duplicateProtocol) {
      return res.status(400).json({ error: 'Protocol number already exists' });
    }
    
    // Validate quantities
    if (qt_controlled < 0 || qt_non_compliant < 0) {
      return res.status(400).json({ error: 'Quantities cannot be negative' });
    }
    
    if (qt_non_compliant > qt_controlled) {
      return res.status(400).json({ error: 'Non-compliant quantity cannot exceed controlled quantity' });
    }
    
    await runQuery(
      `UPDATE supply_check SET 
        fk_lot_in = ?, date = ?, protocol = ?, qt_controlled = ?, 
        qt_non_compliant = ?, dim_calib = ?
       WHERE id = ?`,
      [fk_lot_in, date, protocol, qt_controlled, qt_non_compliant, dim_calib, checkId]
    );
    
    const updatedCheck = await getRow(`
      SELECT 
        sc.*,
        li.lot_number,
        li.acceptance_date,
        li.ddt_number,
        s.name as supplier_name,
        s.vat as supplier_vat,
        fi.name as food_name
      FROM supply_check sc
      LEFT JOIN lot_in li ON sc.fk_lot_in = li.id
      LEFT JOIN supplier s ON li.fk_supplier = s.id
      LEFT JOIN food_in fi ON li.fk_food_in = fi.id
      WHERE sc.id = ?
    `, [checkId]);
    
    res.json(updatedCheck);
  } catch (error) {
    console.error('Error updating quality check:', error);
    res.status(500).json({ error: 'Failed to update quality check' });
  }
});

// Delete quality check
router.delete('/:id', async (req, res) => {
  try {
    const checkId = req.params.id;
    
    // Check if check exists
    const existingCheck = await getRow(
      'SELECT id FROM supply_check WHERE id = ?',
      [checkId]
    );
    
    if (!existingCheck) {
      return res.status(404).json({ error: 'Quality check not found' });
    }
    
    await runQuery('DELETE FROM supply_check WHERE id = ?', [checkId]);
    
    res.json({ message: 'Quality check deleted successfully' });
  } catch (error) {
    console.error('Error deleting quality check:', error);
    res.status(500).json({ error: 'Failed to delete quality check' });
  }
});

// Search quality checks
router.get('/search/:query', async (req, res) => {
  try {
    const query = `%${req.params.query}%`;
    const checks = await getAll(`
      SELECT 
        sc.*,
        li.lot_number,
        li.acceptance_date,
        li.ddt_number,
        s.name as supplier_name,
        s.vat as supplier_vat,
        fi.name as food_name
      FROM supply_check sc
      LEFT JOIN lot_in li ON sc.fk_lot_in = li.id
      LEFT JOIN supplier s ON li.fk_supplier = s.id
      LEFT JOIN food_in fi ON li.fk_food_in = fi.id
      WHERE sc.protocol LIKE ? OR li.lot_number LIKE ? OR s.name LIKE ? OR fi.name LIKE ?
      ORDER BY sc.date DESC
    `, [query, query, query, query]);
    
    res.json(checks);
  } catch (error) {
    console.error('Error searching quality checks:', error);
    res.status(500).json({ error: 'Failed to search quality checks' });
  }
});

// Get checks by lot
router.get('/lot/:lotId', async (req, res) => {
  try {
    const lotId = req.params.lotId;
    
    // Check if lot exists
    const lot = await getRow(
      'SELECT id FROM lot_in WHERE id = ?',
      [lotId]
    );
    
    if (!lot) {
      return res.status(404).json({ error: 'Incoming lot not found' });
    }
    
    const checks = await getAll(`
      SELECT 
        sc.*,
        li.lot_number,
        li.acceptance_date,
        li.ddt_number,
        s.name as supplier_name,
        s.vat as supplier_vat,
        fi.name as food_name
      FROM supply_check sc
      LEFT JOIN lot_in li ON sc.fk_lot_in = li.id
      LEFT JOIN supplier s ON li.fk_supplier = s.id
      LEFT JOIN food_in fi ON li.fk_food_in = fi.id
      WHERE sc.fk_lot_in = ?
      ORDER BY sc.date DESC
    `, [lotId]);
    
    res.json(checks);
  } catch (error) {
    console.error('Error fetching checks by lot:', error);
    res.status(500).json({ error: 'Failed to fetch checks by lot' });
  }
});

// Get checks by supplier
router.get('/supplier/:supplierId', async (req, res) => {
  try {
    const supplierId = req.params.supplierId;
    
    // Check if supplier exists
    const supplier = await getRow(
      'SELECT id FROM supplier WHERE id = ?',
      [supplierId]
    );
    
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    
    const checks = await getAll(`
      SELECT 
        sc.*,
        li.lot_number,
        li.acceptance_date,
        li.ddt_number,
        s.name as supplier_name,
        s.vat as supplier_vat,
        fi.name as food_name
      FROM supply_check sc
      LEFT JOIN lot_in li ON sc.fk_lot_in = li.id
      LEFT JOIN supplier s ON li.fk_supplier = s.id
      LEFT JOIN food_in fi ON li.fk_food_in = fi.id
      WHERE li.fk_supplier = ?
      ORDER BY sc.date DESC
    `, [supplierId]);
    
    res.json(checks);
  } catch (error) {
    console.error('Error fetching checks by supplier:', error);
    res.status(500).json({ error: 'Failed to fetch checks by supplier' });
  }
});

// Get quality check statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const totalChecks = await getRow('SELECT COUNT(*) as count FROM supply_check');
    const totalControlled = await getRow('SELECT SUM(qt_controlled) as total FROM supply_check');
    const totalNonCompliant = await getRow('SELECT SUM(qt_non_compliant) as total FROM supply_check');
    
    const complianceRate = totalControlled.total > 0 
      ? ((totalControlled.total - totalNonCompliant.total) / totalControlled.total * 100).toFixed(2)
      : 0;
    
    res.json({
      totalChecks: totalChecks.count,
      totalControlled: totalControlled.total || 0,
      totalNonCompliant: totalNonCompliant.total || 0,
      complianceRate: parseFloat(complianceRate)
    });
  } catch (error) {
    console.error('Error fetching quality check statistics:', error);
    res.status(500).json({ error: 'Failed to fetch quality check statistics' });
  }
});

module.exports = router; 