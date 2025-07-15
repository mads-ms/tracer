const express = require('express');
const router = express.Router();
const { runQuery, getRow, getAll } = require('../database/database');

// Get all incoming lots
router.get('/', async (req, res) => {
  try {
    const lots = await getAll(`
      SELECT 
        li.*,
        fi.name as food_name,
        fi.source as food_source,
        fi.unit_measure,
        s.name as supplier_name,
        s.vat as supplier_vat
      FROM lot_in li
      JOIN food_in fi ON li.fk_food_in = fi.id
      JOIN supplier s ON li.fk_supplier = s.id
      ORDER BY li.acceptance_date DESC
    `);
    res.json(lots);
  } catch (error) {
    console.error('Error fetching incoming lots:', error);
    res.status(500).json({ error: 'Failed to fetch incoming lots' });
  }
});

// Get lot by ID
router.get('/:id', async (req, res) => {
  try {
    const lot = await getRow(`
      SELECT 
        li.*,
        fi.name as food_name,
        fi.source as food_source,
        fi.unit_measure,
        s.name as supplier_name,
        s.vat as supplier_vat
      FROM lot_in li
      JOIN food_in fi ON li.fk_food_in = fi.id
      JOIN supplier s ON li.fk_supplier = s.id
      WHERE li.id = ?
    `, [req.params.id]);
    
    if (!lot) {
      return res.status(404).json({ error: 'Lot not found' });
    }
    res.json(lot);
  } catch (error) {
    console.error('Error fetching lot:', error);
    res.status(500).json({ error: 'Failed to fetch lot' });
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
      fk_food_in,
      fk_supplier
    } = req.body;

    // Validate required fields
    if (!acceptance_date || !lot_number || !ddt_number || !ddt_date || 
        !quantity || !fk_food_in || !fk_supplier) {
      return res.status(400).json({ 
        error: 'All fields are required except expiry_date' 
      });
    }

    // Check if lot number already exists
    const existingLot = await getRow('SELECT id FROM lot_in WHERE lot_number = ?', [lot_number]);
    if (existingLot) {
      return res.status(400).json({ error: 'Lot number already exists' });
    }

    // Check if food exists
    const food = await getRow('SELECT id FROM food_in WHERE id = ?', [fk_food_in]);
    if (!food) {
      return res.status(400).json({ error: 'Food not found' });
    }

    // Check if supplier exists
    const supplier = await getRow('SELECT id FROM supplier WHERE id = ?', [fk_supplier]);
    if (!supplier) {
      return res.status(400).json({ error: 'Supplier not found' });
    }

    const result = await runQuery(`
      INSERT INTO lot_in (
        acceptance_date, lot_number, ddt_number, ddt_date, 
        expiry_date, quantity, quantity_remaining, fk_food_in, fk_supplier
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      acceptance_date, lot_number, ddt_number, ddt_date, 
      expiry_date || null, quantity, quantity, fk_food_in, fk_supplier
    ]);

    const newLot = await getRow(`
      SELECT 
        li.*,
        fi.name as food_name,
        fi.source as food_source,
        fi.unit_measure,
        s.name as supplier_name,
        s.vat as supplier_vat
      FROM lot_in li
      JOIN food_in fi ON li.fk_food_in = fi.id
      JOIN supplier s ON li.fk_supplier = s.id
      WHERE li.id = ?
    `, [result.id]);

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

    // Validate required fields
    if (!acceptance_date || !lot_number || !ddt_number || !ddt_date || 
        !quantity || !fk_food_in || !fk_supplier) {
      return res.status(400).json({ 
        error: 'All fields are required except expiry_date' 
      });
    }

    // Check if lot exists
    const existingLot = await getRow('SELECT id FROM lot_in WHERE id = ?', [lotId]);
    if (!existingLot) {
      return res.status(404).json({ error: 'Lot not found' });
    }

    // Check if lot number already exists for another lot
    const duplicateLot = await getRow('SELECT id FROM lot_in WHERE lot_number = ? AND id != ?', [lot_number, lotId]);
    if (duplicateLot) {
      return res.status(400).json({ error: 'Lot number already exists' });
    }

    // Check if food exists
    const food = await getRow('SELECT id FROM food_in WHERE id = ?', [fk_food_in]);
    if (!food) {
      return res.status(400).json({ error: 'Food not found' });
    }

    // Check if supplier exists
    const supplier = await getRow('SELECT id FROM supplier WHERE id = ?', [fk_supplier]);
    if (!supplier) {
      return res.status(400).json({ error: 'Supplier not found' });
    }

    await runQuery(`
      UPDATE lot_in SET 
        acceptance_date = ?, lot_number = ?, ddt_number = ?, ddt_date = ?,
        expiry_date = ?, quantity = ?, quantity_remaining = ?, 
        fk_food_in = ?, fk_supplier = ?
      WHERE id = ?
    `, [
      acceptance_date, lot_number, ddt_number, ddt_date,
      expiry_date || null, quantity, quantity_remaining || quantity,
      fk_food_in, fk_supplier, lotId
    ]);

    const updatedLot = await getRow(`
      SELECT 
        li.*,
        fi.name as food_name,
        fi.source as food_source,
        fi.unit_measure,
        s.name as supplier_name,
        s.vat as supplier_vat
      FROM lot_in li
      JOIN food_in fi ON li.fk_food_in = fi.id
      JOIN supplier s ON li.fk_supplier = s.id
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
    const existingLot = await getRow('SELECT id FROM lot_in WHERE id = ?', [lotId]);
    if (!existingLot) {
      return res.status(404).json({ error: 'Lot not found' });
    }

    // Check if lot is used in any sales or food compositions
    const usedInSales = await getRow('SELECT COUNT(*) as count FROM sell WHERE fk_lot_in = ?', [lotId]);
    const usedInCompositions = await getRow('SELECT COUNT(*) as count FROM food_out_composition WHERE fk_lot_in = ?', [lotId]);

    if (usedInSales.count > 0 || usedInCompositions.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete lot. It is used in sales or food compositions.' 
      });
    }

    await runQuery('DELETE FROM lot_in WHERE id = ?', [lotId]);
    res.json({ message: 'Lot deleted successfully' });
  } catch (error) {
    console.error('Error deleting lot:', error);
    res.status(500).json({ error: 'Failed to delete lot' });
  }
});

// Search lots
router.get('/search/:query', async (req, res) => {
  try {
    const query = `%${req.params.query}%`;
    const lots = await getAll(`
      SELECT 
        li.*,
        fi.name as food_name,
        fi.source as food_source,
        fi.unit_measure,
        s.name as supplier_name,
        s.vat as supplier_vat
      FROM lot_in li
      JOIN food_in fi ON li.fk_food_in = fi.id
      JOIN supplier s ON li.fk_supplier = s.id
      WHERE li.lot_number LIKE ? OR fi.name LIKE ? OR s.name LIKE ?
      ORDER BY li.acceptance_date DESC
    `, [query, query, query]);
    res.json(lots);
  } catch (error) {
    console.error('Error searching lots:', error);
    res.status(500).json({ error: 'Failed to search lots' });
  }
});

// Get lots by supplier
router.get('/supplier/:supplierId', async (req, res) => {
  try {
    const supplierId = req.params.supplierId;
    
    // Check if supplier exists
    const supplier = await getRow('SELECT id FROM supplier WHERE id = ?', [supplierId]);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    const lots = await getAll(`
      SELECT 
        li.*,
        fi.name as food_name,
        fi.source as food_source,
        fi.unit_measure,
        s.name as supplier_name,
        s.vat as supplier_vat
      FROM lot_in li
      JOIN food_in fi ON li.fk_food_in = fi.id
      JOIN supplier s ON li.fk_supplier = s.id
      WHERE li.fk_supplier = ?
      ORDER BY li.acceptance_date DESC
    `, [supplierId]);

    res.json(lots);
  } catch (error) {
    console.error('Error fetching supplier lots:', error);
    res.status(500).json({ error: 'Failed to fetch supplier lots' });
  }
});

// Get lots by food
router.get('/food/:foodId', async (req, res) => {
  try {
    const foodId = req.params.foodId;
    
    // Check if food exists
    const food = await getRow('SELECT id FROM food_in WHERE id = ?', [foodId]);
    if (!food) {
      return res.status(404).json({ error: 'Food not found' });
    }

    const lots = await getAll(`
      SELECT 
        li.*,
        fi.name as food_name,
        fi.source as food_source,
        fi.unit_measure,
        s.name as supplier_name,
        s.vat as supplier_vat
      FROM lot_in li
      JOIN food_in fi ON li.fk_food_in = fi.id
      JOIN supplier s ON li.fk_supplier = s.id
      WHERE li.fk_food_in = ?
      ORDER BY li.acceptance_date DESC
    `, [foodId]);

    res.json(lots);
  } catch (error) {
    console.error('Error fetching food lots:', error);
    res.status(500).json({ error: 'Failed to fetch food lots' });
  }
});

// Get lot statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const totalLots = await getRow('SELECT COUNT(*) as count FROM lot_in');
    const totalQuantity = await getRow('SELECT SUM(quantity) as total FROM lot_in');
    const remainingQuantity = await getRow('SELECT SUM(quantity_remaining) as total FROM lot_in');
    const expiredLots = await getRow(`
      SELECT COUNT(*) as count FROM lot_in 
      WHERE expiry_date IS NOT NULL AND expiry_date < date('now')
    `);
    
    res.json({
      totalLots: totalLots.count,
      totalQuantity: totalQuantity.total || 0,
      remainingQuantity: remainingQuantity.total || 0,
      expiredLots: expiredLots.count
    });
  } catch (error) {
    console.error('Error fetching lot statistics:', error);
    res.status(500).json({ error: 'Failed to fetch lot statistics' });
  }
});

module.exports = router; 