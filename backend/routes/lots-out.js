const express = require('express');
const router = express.Router();
const { runQuery, getRow, getAll } = require('../database/database');

// Get all outgoing lots with food and lot details
router.get('/', async (req, res) => {
  try {
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
      ORDER BY lo.creation_date DESC
    `);
    res.json(lots);
  } catch (error) {
    console.error('Error fetching outgoing lots:', error);
    res.status(500).json({ error: 'Failed to fetch outgoing lots' });
  }
});

// Get outgoing lot by ID
router.get('/:id', async (req, res) => {
  try {
    const lot = await getRow(`
      SELECT 
        lo.*,
        fo.name as food_name,
        fo.unit_measure,
        g.code as gtin_code,
        g.progressive,
        li.lot_number as source_lot_number,
        li.acceptance_date as source_acceptance_date,
        li.ddt_number as source_ddt_number,
        li.quantity as source_quantity,
        li.quantity_remaining as source_quantity_remaining,
        fi.name as source_food_name,
        fi.source as source_food_source,
        s.name as source_supplier_name,
        s.vat as source_supplier_vat
      FROM lot_out lo
      LEFT JOIN food_out fo ON lo.fk_food_out = fo.id
      LEFT JOIN gtin_13 g ON fo.fk_gtin = g.id
      LEFT JOIN lot_in li ON lo.fk_lot_in = li.id
      LEFT JOIN food_in fi ON li.fk_food_in = fi.id
      LEFT JOIN supplier s ON li.fk_supplier = s.id
      WHERE lo.id = ?
    `, [req.params.id]);
    
    if (!lot) {
      return res.status(404).json({ error: 'Outgoing lot not found' });
    }
    
    res.json(lot);
  } catch (error) {
    console.error('Error fetching outgoing lot:', error);
    res.status(500).json({ error: 'Failed to fetch outgoing lot' });
  }
});

// Create new outgoing lot
router.post('/', async (req, res) => {
  try {
    const {
      lot_number,
      creation_date,
      expiry_date,
      quantity_of_food,
      fk_food_out,
      fk_lot_in
    } = req.body;
    
    // Validation
    if (!lot_number || !creation_date || !expiry_date || !quantity_of_food || !fk_food_out) {
      return res.status(400).json({ 
        error: 'Required fields: lot_number, creation_date, expiry_date, quantity_of_food, fk_food_out' 
      });
    }
    
    // Check if lot number already exists
    const existingLot = await getRow(
      'SELECT id FROM lot_out WHERE lot_number = ?',
      [lot_number]
    );
    
    if (existingLot) {
      return res.status(400).json({ error: 'Lot number already exists' });
    }
    
    // Check if processed food exists
    const food = await getRow(
      'SELECT id FROM food_out WHERE id = ?',
      [fk_food_out]
    );
    
    if (!food) {
      return res.status(400).json({ error: 'Processed food not found' });
    }
    
    // Check if source lot exists (if provided)
    if (fk_lot_in) {
      const sourceLot = await getRow(
        'SELECT id, quantity_remaining FROM lot_in WHERE id = ?',
        [fk_lot_in]
      );
      
      if (!sourceLot) {
        return res.status(400).json({ error: 'Source lot not found' });
      }
      
      // Check if source lot has enough quantity remaining
      if (sourceLot.quantity_remaining < quantity_of_food) {
        return res.status(400).json({ 
          error: 'Source lot does not have enough quantity remaining' 
        });
      }
      
      // Update source lot quantity remaining
      const newQuantityRemaining = sourceLot.quantity_remaining - quantity_of_food;
      await runQuery(
        'UPDATE lot_in SET quantity_remaining = ? WHERE id = ?',
        [newQuantityRemaining, fk_lot_in]
      );
    }
    
    const result = await runQuery(
      `INSERT INTO lot_out (
        lot_number, creation_date, expiry_date, quantity_of_food,
        fk_food_out, fk_lot_in
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [lot_number, creation_date, expiry_date, quantity_of_food, fk_food_out, fk_lot_in || null]
    );
    
    const newLot = await getRow(`
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
      WHERE lo.id = ?
    `, [result.lastID]);
    
    res.status(201).json(newLot);
  } catch (error) {
    console.error('Error creating outgoing lot:', error);
    res.status(500).json({ error: 'Failed to create outgoing lot' });
  }
});

// Update outgoing lot
router.put('/:id', async (req, res) => {
  try {
    const {
      lot_number,
      creation_date,
      expiry_date,
      quantity_of_food,
      fk_food_out,
      fk_lot_in
    } = req.body;
    const lotId = req.params.id;
    
    // Validation
    if (!lot_number || !creation_date || !expiry_date || !quantity_of_food || !fk_food_out) {
      return res.status(400).json({ 
        error: 'Required fields: lot_number, creation_date, expiry_date, quantity_of_food, fk_food_out' 
      });
    }
    
    // Check if lot exists
    const existingLot = await getRow(
      'SELECT id, fk_lot_in, quantity_of_food FROM lot_out WHERE id = ?',
      [lotId]
    );
    
    if (!existingLot) {
      return res.status(404).json({ error: 'Outgoing lot not found' });
    }
    
    // Check if lot number already exists for another lot
    const duplicateLotNumber = await getRow(
      'SELECT id FROM lot_out WHERE lot_number = ? AND id != ?',
      [lot_number, lotId]
    );
    
    if (duplicateLotNumber) {
      return res.status(400).json({ error: 'Lot number already exists' });
    }
    
    // Check if processed food exists
    const food = await getRow(
      'SELECT id FROM food_out WHERE id = ?',
      [fk_food_out]
    );
    
    if (!food) {
      return res.status(400).json({ error: 'Processed food not found' });
    }
    
    // Handle source lot quantity updates
    if (existingLot.fk_lot_in) {
      // Restore original quantity to source lot
      const sourceLot = await getRow(
        'SELECT quantity_remaining FROM lot_in WHERE id = ?',
        [existingLot.fk_lot_in]
      );
      
      if (sourceLot) {
        const restoredQuantity = sourceLot.quantity_remaining + existingLot.quantity_of_food;
        await runQuery(
          'UPDATE lot_in SET quantity_remaining = ? WHERE id = ?',
          [restoredQuantity, existingLot.fk_lot_in]
        );
      }
    }
    
    // Update new source lot quantity (if different)
    if (fk_lot_in && fk_lot_in !== existingLot.fk_lot_in) {
      const newSourceLot = await getRow(
        'SELECT id, quantity_remaining FROM lot_in WHERE id = ?',
        [fk_lot_in]
      );
      
      if (!newSourceLot) {
        return res.status(400).json({ error: 'New source lot not found' });
      }
      
      if (newSourceLot.quantity_remaining < quantity_of_food) {
        return res.status(400).json({ 
          error: 'New source lot does not have enough quantity remaining' 
        });
      }
      
      const newQuantityRemaining = newSourceLot.quantity_remaining - quantity_of_food;
      await runQuery(
        'UPDATE lot_in SET quantity_remaining = ? WHERE id = ?',
        [newQuantityRemaining, fk_lot_in]
      );
    } else if (fk_lot_in === existingLot.fk_lot_in && quantity_of_food !== existingLot.quantity_of_food) {
      // Same source lot but different quantity
      const sourceLot = await getRow(
        'SELECT id, quantity_remaining FROM lot_in WHERE id = ?',
        [fk_lot_in]
      );
      
      if (sourceLot) {
        const quantityDifference = existingLot.quantity_of_food - quantity_of_food;
        const newQuantityRemaining = sourceLot.quantity_remaining + quantityDifference;
        
        if (newQuantityRemaining < 0) {
          return res.status(400).json({ 
            error: 'Source lot does not have enough quantity remaining' 
          });
        }
        
        await runQuery(
          'UPDATE lot_in SET quantity_remaining = ? WHERE id = ?',
          [newQuantityRemaining, fk_lot_in]
        );
      }
    }
    
    await runQuery(
      `UPDATE lot_out SET 
        lot_number = ?, creation_date = ?, expiry_date = ?, quantity_of_food = ?,
        fk_food_out = ?, fk_lot_in = ?
       WHERE id = ?`,
      [lot_number, creation_date, expiry_date, quantity_of_food, fk_food_out, fk_lot_in || null, lotId]
    );
    
    const updatedLot = await getRow(`
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
      WHERE lo.id = ?
    `, [lotId]);
    
    res.json(updatedLot);
  } catch (error) {
    console.error('Error updating outgoing lot:', error);
    res.status(500).json({ error: 'Failed to update outgoing lot' });
  }
});

// Delete outgoing lot
router.delete('/:id', async (req, res) => {
  try {
    const lotId = req.params.id;
    
    // Check if lot exists
    const existingLot = await getRow(
      'SELECT id, fk_lot_in, quantity_of_food FROM lot_out WHERE id = ?',
      [lotId]
    );
    
    if (!existingLot) {
      return res.status(404).json({ error: 'Outgoing lot not found' });
    }
    
    // Check if lot is referenced in sales
    const salesCount = await getRow(
      'SELECT COUNT(*) as count FROM sell WHERE fk_lot_out = ?',
      [lotId]
    );
    
    if (salesCount.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete outgoing lot: it is referenced in sales' 
      });
    }
    
    // Restore quantity to source lot if exists
    if (existingLot.fk_lot_in) {
      const sourceLot = await getRow(
        'SELECT quantity_remaining FROM lot_in WHERE id = ?',
        [existingLot.fk_lot_in]
      );
      
      if (sourceLot) {
        const restoredQuantity = sourceLot.quantity_remaining + existingLot.quantity_of_food;
        await runQuery(
          'UPDATE lot_in SET quantity_remaining = ? WHERE id = ?',
          [restoredQuantity, existingLot.fk_lot_in]
        );
      }
    }
    
    await runQuery('DELETE FROM lot_out WHERE id = ?', [lotId]);
    
    res.json({ message: 'Outgoing lot deleted successfully' });
  } catch (error) {
    console.error('Error deleting outgoing lot:', error);
    res.status(500).json({ error: 'Failed to delete outgoing lot' });
  }
});

// Search outgoing lots
router.get('/search/:query', async (req, res) => {
  try {
    const query = `%${req.params.query}%`;
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
      WHERE lo.lot_number LIKE ? OR fo.name LIKE ? OR li.lot_number LIKE ? OR fi.name LIKE ?
      ORDER BY lo.creation_date DESC
    `, [query, query, query, query]);
    
    res.json(lots);
  } catch (error) {
    console.error('Error searching outgoing lots:', error);
    res.status(500).json({ error: 'Failed to search outgoing lots' });
  }
});

// Get lots by processed food
router.get('/food/:foodId', async (req, res) => {
  try {
    const foodId = req.params.foodId;
    
    // Check if food exists
    const food = await getRow(
      'SELECT id FROM food_out WHERE id = ?',
      [foodId]
    );
    
    if (!food) {
      return res.status(404).json({ error: 'Processed food not found' });
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
      WHERE lo.fk_food_out = ?
      ORDER BY lo.creation_date DESC
    `, [foodId]);
    
    res.json(lots);
  } catch (error) {
    console.error('Error fetching lots by food:', error);
    res.status(500).json({ error: 'Failed to fetch lots by food' });
  }
});

// Get lots by source lot
router.get('/source/:lotInId', async (req, res) => {
  try {
    const lotInId = req.params.lotInId;
    
    // Check if source lot exists
    const sourceLot = await getRow(
      'SELECT id FROM lot_in WHERE id = ?',
      [lotInId]
    );
    
    if (!sourceLot) {
      return res.status(404).json({ error: 'Source lot not found' });
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
      WHERE lo.fk_lot_in = ?
      ORDER BY lo.creation_date DESC
    `, [lotInId]);
    
    res.json(lots);
  } catch (error) {
    console.error('Error fetching lots by source:', error);
    res.status(500).json({ error: 'Failed to fetch lots by source' });
  }
});

module.exports = router; 