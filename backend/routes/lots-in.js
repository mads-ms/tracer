const express = require('express');
const router = express.Router();
const { runQuery, getRow, getAll } = require('../database/database');

// Get all incoming lots with supplier and food details
router.get('/', async (req, res) => {
  try {
    const lots = await getAll(`
      SELECT 
        li.*,
        s.name as supplier_name,
        s.vat as supplier_vat,
        fi.name as food_name,
        fi.unit_measure
      FROM lot_in li
      LEFT JOIN supplier s ON li.fk_supplier = s.id
      LEFT JOIN food_in fi ON li.fk_food_in = fi.id
      ORDER BY li.acceptance_date DESC
    `);
    res.json(lots);
  } catch (error) {
    console.error('Error fetching incoming lots:', error);
    res.status(500).json({ error: 'Failed to fetch incoming lots' });
  }
});

// Get incoming lot by ID
router.get('/:id', async (req, res) => {
  try {
    const lot = await getRow(`
      SELECT 
        li.*,
        s.name as supplier_name,
        s.vat as supplier_vat,
        s.address as supplier_address,
        s.phone as supplier_phone,
        fi.name as food_name,
        fi.unit_measure,
        fi.source,
        fi.expiry_date as food_expiry_date,
        fi.gtin_number
      FROM lot_in li
      LEFT JOIN supplier s ON li.fk_supplier = s.id
      LEFT JOIN food_in fi ON li.fk_food_in = fi.id
      WHERE li.id = ?
    `, [req.params.id]);
    
    if (!lot) {
      return res.status(404).json({ error: 'Incoming lot not found' });
    }
    
    res.json(lot);
  } catch (error) {
    console.error('Error fetching incoming lot:', error);
    res.status(500).json({ error: 'Failed to fetch incoming lot' });
  }
});

// Create new incoming lot
router.post('/', async (req, res) => {
  try {
    const {
      acceptance_date,
      lot_number,
      ddt_number,
      ddt_date,
      expiry_date,
      quantity,
      quantity_remaining,
      fk_food_in,
      fk_supplier
    } = req.body;
    
    // Validation
    if (!acceptance_date || !lot_number || !ddt_number || !ddt_date || 
        !quantity || !fk_food_in || !fk_supplier) {
      return res.status(400).json({ 
        error: 'Required fields: acceptance_date, lot_number, ddt_number, ddt_date, quantity, fk_food_in, fk_supplier' 
      });
    }
    
    // Check if lot number already exists
    const existingLot = await getRow(
      'SELECT id FROM lot_in WHERE lot_number = ?',
      [lot_number]
    );
    
    if (existingLot) {
      return res.status(400).json({ error: 'Lot number already exists' });
    }
    
    // Check if supplier exists
    const supplier = await getRow(
      'SELECT id FROM supplier WHERE id = ?',
      [fk_supplier]
    );
    
    if (!supplier) {
      return res.status(400).json({ error: 'Supplier not found' });
    }
    
    // Check if food exists
    const food = await getRow(
      'SELECT id FROM food_in WHERE id = ?',
      [fk_food_in]
    );
    
    if (!food) {
      return res.status(400).json({ error: 'Food not found' });
    }
    
    // Set quantity_remaining to quantity if not provided
    const finalQuantityRemaining = quantity_remaining !== undefined ? quantity_remaining : quantity;
    
    const result = await runQuery(
      `INSERT INTO lot_in (
        acceptance_date, lot_number, ddt_number, ddt_date, expiry_date,
        quantity, quantity_remaining, fk_food_in, fk_supplier
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [acceptance_date, lot_number, ddt_number, ddt_date, expiry_date,
       quantity, finalQuantityRemaining, fk_food_in, fk_supplier]
    );
    
    const newLot = await getRow(`
      SELECT 
        li.*,
        s.name as supplier_name,
        s.vat as supplier_vat,
        fi.name as food_name,
        fi.unit_measure
      FROM lot_in li
      LEFT JOIN supplier s ON li.fk_supplier = s.id
      LEFT JOIN food_in fi ON li.fk_food_in = fi.id
      WHERE li.id = ?
    `, [result.lastID]);
    
    res.status(201).json(newLot);
  } catch (error) {
    console.error('Error creating incoming lot:', error);
    res.status(500).json({ error: 'Failed to create incoming lot' });
  }
});

// Update incoming lot
router.put('/:id', async (req, res) => {
  try {
    const {
      acceptance_date,
      lot_number,
      ddt_number,
      ddt_date,
      expiry_date,
      quantity,
      quantity_remaining,
      fk_food_in,
      fk_supplier
    } = req.body;
    const lotId = req.params.id;
    
    // Validation
    if (!acceptance_date || !lot_number || !ddt_number || !ddt_date || 
        !quantity || !fk_food_in || !fk_supplier) {
      return res.status(400).json({ 
        error: 'Required fields: acceptance_date, lot_number, ddt_number, ddt_date, quantity, fk_food_in, fk_supplier' 
      });
    }
    
    // Check if lot exists
    const existingLot = await getRow(
      'SELECT id FROM lot_in WHERE id = ?',
      [lotId]
    );
    
    if (!existingLot) {
      return res.status(404).json({ error: 'Incoming lot not found' });
    }
    
    // Check if lot number already exists for another lot
    const duplicateLotNumber = await getRow(
      'SELECT id FROM lot_in WHERE lot_number = ? AND id != ?',
      [lot_number, lotId]
    );
    
    if (duplicateLotNumber) {
      return res.status(400).json({ error: 'Lot number already exists' });
    }
    
    // Check if supplier exists
    const supplier = await getRow(
      'SELECT id FROM supplier WHERE id = ?',
      [fk_supplier]
    );
    
    if (!supplier) {
      return res.status(400).json({ error: 'Supplier not found' });
    }
    
    // Check if food exists
    const food = await getRow(
      'SELECT id FROM food_in WHERE id = ?',
      [fk_food_in]
    );
    
    if (!food) {
      return res.status(400).json({ error: 'Food not found' });
    }
    
    await runQuery(
      `UPDATE lot_in SET 
        acceptance_date = ?, lot_number = ?, ddt_number = ?, ddt_date = ?,
        expiry_date = ?, quantity = ?, quantity_remaining = ?, 
        fk_food_in = ?, fk_supplier = ?
       WHERE id = ?`,
      [acceptance_date, lot_number, ddt_number, ddt_date, expiry_date,
       quantity, quantity_remaining, fk_food_in, fk_supplier, lotId]
    );
    
    const updatedLot = await getRow(`
      SELECT 
        li.*,
        s.name as supplier_name,
        s.vat as supplier_vat,
        fi.name as food_name,
        fi.unit_measure
      FROM lot_in li
      LEFT JOIN supplier s ON li.fk_supplier = s.id
      LEFT JOIN food_in fi ON li.fk_food_in = fi.id
      WHERE li.id = ?
    `, [lotId]);
    
    res.json(updatedLot);
  } catch (error) {
    console.error('Error updating incoming lot:', error);
    res.status(500).json({ error: 'Failed to update incoming lot' });
  }
});

// Delete incoming lot
router.delete('/:id', async (req, res) => {
  try {
    const lotId = req.params.id;
    
    // Check if lot exists
    const existingLot = await getRow(
      'SELECT id FROM lot_in WHERE id = ?',
      [lotId]
    );
    
    if (!existingLot) {
      return res.status(404).json({ error: 'Incoming lot not found' });
    }
    
    // Check if lot is referenced in outgoing lots
    const outgoingLotsCount = await getRow(
      'SELECT COUNT(*) as count FROM lot_out WHERE fk_lot_in = ?',
      [lotId]
    );
    
    if (outgoingLotsCount.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete incoming lot: it is referenced in outgoing lots' 
      });
    }
    
    // Check if lot is referenced in sales
    const salesCount = await getRow(
      'SELECT COUNT(*) as count FROM sell WHERE fk_lot_in = ?',
      [lotId]
    );
    
    if (salesCount.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete incoming lot: it is referenced in sales' 
      });
    }
    
    // Check if lot is referenced in quality checks
    const checksCount = await getRow(
      'SELECT COUNT(*) as count FROM supply_check WHERE fk_lot_in = ?',
      [lotId]
    );
    
    if (checksCount.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete incoming lot: it has associated quality checks' 
      });
    }
    
    await runQuery('DELETE FROM lot_in WHERE id = ?', [lotId]);
    
    res.json({ message: 'Incoming lot deleted successfully' });
  } catch (error) {
    console.error('Error deleting incoming lot:', error);
    res.status(500).json({ error: 'Failed to delete incoming lot' });
  }
});

// Search incoming lots
router.get('/search/:query', async (req, res) => {
  try {
    const query = `%${req.params.query}%`;
    const lots = await getAll(`
      SELECT 
        li.*,
        s.name as supplier_name,
        s.vat as supplier_vat,
        fi.name as food_name,
        fi.unit_measure
      FROM lot_in li
      LEFT JOIN supplier s ON li.fk_supplier = s.id
      LEFT JOIN food_in fi ON li.fk_food_in = fi.id
      WHERE li.lot_number LIKE ? OR li.ddt_number LIKE ? OR s.name LIKE ? OR fi.name LIKE ?
      ORDER BY li.acceptance_date DESC
    `, [query, query, query, query]);
    
    res.json(lots);
  } catch (error) {
    console.error('Error searching incoming lots:', error);
    res.status(500).json({ error: 'Failed to search incoming lots' });
  }
});

// Get lots by supplier
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
    
    const lots = await getAll(`
      SELECT 
        li.*,
        s.name as supplier_name,
        s.vat as supplier_vat,
        fi.name as food_name,
        fi.unit_measure
      FROM lot_in li
      LEFT JOIN supplier s ON li.fk_supplier = s.id
      LEFT JOIN food_in fi ON li.fk_food_in = fi.id
      WHERE li.fk_supplier = ?
      ORDER BY li.acceptance_date DESC
    `, [supplierId]);
    
    res.json(lots);
  } catch (error) {
    console.error('Error fetching lots by supplier:', error);
    res.status(500).json({ error: 'Failed to fetch lots by supplier' });
  }
});

// Get lots by food
router.get('/food/:foodId', async (req, res) => {
  try {
    const foodId = req.params.foodId;
    
    // Check if food exists
    const food = await getRow(
      'SELECT id FROM food_in WHERE id = ?',
      [foodId]
    );
    
    if (!food) {
      return res.status(404).json({ error: 'Food not found' });
    }
    
    const lots = await getAll(`
      SELECT 
        li.*,
        s.name as supplier_name,
        s.vat as supplier_vat,
        fi.name as food_name,
        fi.unit_measure
      FROM lot_in li
      LEFT JOIN supplier s ON li.fk_supplier = s.id
      LEFT JOIN food_in fi ON li.fk_food_in = fi.id
      WHERE li.fk_food_in = ?
      ORDER BY li.acceptance_date DESC
    `, [foodId]);
    
    res.json(lots);
  } catch (error) {
    console.error('Error fetching lots by food:', error);
    res.status(500).json({ error: 'Failed to fetch lots by food' });
  }
});

module.exports = router; 