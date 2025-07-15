const express = require('express');
const router = express.Router();
const { runQuery, getRow, getAll } = require('../database/database');

// Get all raw materials (food_in)
router.get('/raw', async (req, res) => {
  try {
    const foods = await getAll(`
      SELECT * FROM food_in 
      ORDER BY name ASC
    `);
    res.json(foods);
  } catch (error) {
    console.error('Error fetching raw materials:', error);
    res.status(500).json({ error: 'Failed to fetch raw materials' });
  }
});

// Get all processed foods (food_out)
router.get('/processed', async (req, res) => {
  try {
    const foods = await getAll(`
      SELECT 
        fo.*,
        g.code as gtin_code
      FROM food_out fo
      LEFT JOIN gtin_13 g ON fo.fk_gtin = g.id
      ORDER BY fo.name ASC
    `);
    res.json(foods);
  } catch (error) {
    console.error('Error fetching processed foods:', error);
    res.status(500).json({ error: 'Failed to fetch processed foods' });
  }
});

// Get all foods (both raw and processed)
router.get('/', async (req, res) => {
  try {
    const rawFoods = await getAll('SELECT *, "raw" as type FROM food_in ORDER BY name ASC');
    const processedFoods = await getAll(`
      SELECT 
        fo.*,
        g.code as gtin_code,
        "processed" as type
      FROM food_out fo
      LEFT JOIN gtin_13 g ON fo.fk_gtin = g.id
      ORDER BY fo.name ASC
    `);
    
    res.json({
      raw: rawFoods,
      processed: processedFoods,
      all: [...rawFoods, ...processedFoods]
    });
  } catch (error) {
    console.error('Error fetching foods:', error);
    res.status(500).json({ error: 'Failed to fetch foods' });
  }
});

// Get raw material by ID
router.get('/raw/:id', async (req, res) => {
  try {
    const food = await getRow(
      'SELECT * FROM food_in WHERE id = ?',
      [req.params.id]
    );
    
    if (!food) {
      return res.status(404).json({ error: 'Raw material not found' });
    }
    
    res.json(food);
  } catch (error) {
    console.error('Error fetching raw material:', error);
    res.status(500).json({ error: 'Failed to fetch raw material' });
  }
});

// Get processed food by ID
router.get('/processed/:id', async (req, res) => {
  try {
    const food = await getRow(`
      SELECT 
        fo.*,
        g.code as gtin_code,
        g.progressive
      FROM food_out fo
      LEFT JOIN gtin_13 g ON fo.fk_gtin = g.id
      WHERE fo.id = ?
    `, [req.params.id]);
    
    if (!food) {
      return res.status(404).json({ error: 'Processed food not found' });
    }
    
    res.json(food);
  } catch (error) {
    console.error('Error fetching processed food:', error);
    res.status(500).json({ error: 'Failed to fetch processed food' });
  }
});

// Create new raw material
router.post('/raw', async (req, res) => {
  try {
    const { name, unit_measure, source, expiry_date, gtin_number } = req.body;
    
    // Validation
    if (!name || !unit_measure || !source || !expiry_date) {
      return res.status(400).json({ 
        error: 'Required fields: name, unit_measure, source, expiry_date' 
      });
    }
    
    // Check if name already exists
    const existingFood = await getRow(
      'SELECT id FROM food_in WHERE name = ?',
      [name]
    );
    
    if (existingFood) {
      return res.status(400).json({ error: 'Raw material with this name already exists' });
    }
    
    const result = await runQuery(
      `INSERT INTO food_in (name, unit_measure, source, expiry_date, gtin_number) 
       VALUES (?, ?, ?, ?, ?)`,
      [name, unit_measure, source, expiry_date, gtin_number || null]
    );
    
    const newFood = await getRow(
      'SELECT * FROM food_in WHERE id = ?',
      [result.lastID]
    );
    
    res.status(201).json(newFood);
  } catch (error) {
    console.error('Error creating raw material:', error);
    res.status(500).json({ error: 'Failed to create raw material' });
  }
});

// Create new processed food
router.post('/processed', async (req, res) => {
  try {
    const { name, unit_measure, fk_gtin } = req.body;
    
    // Validation
    if (!name || !unit_measure || !fk_gtin) {
      return res.status(400).json({ 
        error: 'Required fields: name, unit_measure, fk_gtin' 
      });
    }
    
    // Check if name already exists
    const existingFood = await getRow(
      'SELECT id FROM food_out WHERE name = ?',
      [name]
    );
    
    if (existingFood) {
      return res.status(400).json({ error: 'Processed food with this name already exists' });
    }
    
    // Check if GTIN exists
    const gtin = await getRow(
      'SELECT id FROM gtin_13 WHERE id = ?',
      [fk_gtin]
    );
    
    if (!gtin) {
      return res.status(400).json({ error: 'GTIN not found' });
    }
    
    const result = await runQuery(
      `INSERT INTO food_out (name, unit_measure, fk_gtin) 
       VALUES (?, ?, ?)`,
      [name, unit_measure, fk_gtin]
    );
    
    const newFood = await getRow(`
      SELECT 
        fo.*,
        g.code as gtin_code
      FROM food_out fo
      LEFT JOIN gtin_13 g ON fo.fk_gtin = g.id
      WHERE fo.id = ?
    `, [result.lastID]);
    
    res.status(201).json(newFood);
  } catch (error) {
    console.error('Error creating processed food:', error);
    res.status(500).json({ error: 'Failed to create processed food' });
  }
});

// Update raw material
router.put('/raw/:id', async (req, res) => {
  try {
    const { name, unit_measure, source, expiry_date, gtin_number } = req.body;
    const foodId = req.params.id;
    
    // Validation
    if (!name || !unit_measure || !source || !expiry_date) {
      return res.status(400).json({ 
        error: 'Required fields: name, unit_measure, source, expiry_date' 
      });
    }
    
    // Check if food exists
    const existingFood = await getRow(
      'SELECT id FROM food_in WHERE id = ?',
      [foodId]
    );
    
    if (!existingFood) {
      return res.status(404).json({ error: 'Raw material not found' });
    }
    
    // Check if name already exists for another food
    const duplicateName = await getRow(
      'SELECT id FROM food_in WHERE name = ? AND id != ?',
      [name, foodId]
    );
    
    if (duplicateName) {
      return res.status(400).json({ error: 'Raw material with this name already exists' });
    }
    
    await runQuery(
      `UPDATE food_in SET 
        name = ?, unit_measure = ?, source = ?, expiry_date = ?, gtin_number = ?
       WHERE id = ?`,
      [name, unit_measure, source, expiry_date, gtin_number || null, foodId]
    );
    
    const updatedFood = await getRow(
      'SELECT * FROM food_in WHERE id = ?',
      [foodId]
    );
    
    res.json(updatedFood);
  } catch (error) {
    console.error('Error updating raw material:', error);
    res.status(500).json({ error: 'Failed to update raw material' });
  }
});

// Update processed food
router.put('/processed/:id', async (req, res) => {
  try {
    const { name, unit_measure, fk_gtin } = req.body;
    const foodId = req.params.id;
    
    // Validation
    if (!name || !unit_measure || !fk_gtin) {
      return res.status(400).json({ 
        error: 'Required fields: name, unit_measure, fk_gtin' 
      });
    }
    
    // Check if food exists
    const existingFood = await getRow(
      'SELECT id FROM food_out WHERE id = ?',
      [foodId]
    );
    
    if (!existingFood) {
      return res.status(404).json({ error: 'Processed food not found' });
    }
    
    // Check if name already exists for another food
    const duplicateName = await getRow(
      'SELECT id FROM food_out WHERE name = ? AND id != ?',
      [name, foodId]
    );
    
    if (duplicateName) {
      return res.status(400).json({ error: 'Processed food with this name already exists' });
    }
    
    // Check if GTIN exists
    const gtin = await getRow(
      'SELECT id FROM gtin_13 WHERE id = ?',
      [fk_gtin]
    );
    
    if (!gtin) {
      return res.status(400).json({ error: 'GTIN not found' });
    }
    
    await runQuery(
      `UPDATE food_out SET 
        name = ?, unit_measure = ?, fk_gtin = ?
       WHERE id = ?`,
      [name, unit_measure, fk_gtin, foodId]
    );
    
    const updatedFood = await getRow(`
      SELECT 
        fo.*,
        g.code as gtin_code
      FROM food_out fo
      LEFT JOIN gtin_13 g ON fo.fk_gtin = g.id
      WHERE fo.id = ?
    `, [foodId]);
    
    res.json(updatedFood);
  } catch (error) {
    console.error('Error updating processed food:', error);
    res.status(500).json({ error: 'Failed to update processed food' });
  }
});

// Delete raw material
router.delete('/raw/:id', async (req, res) => {
  try {
    const foodId = req.params.id;
    
    // Check if food exists
    const existingFood = await getRow(
      'SELECT id FROM food_in WHERE id = ?',
      [foodId]
    );
    
    if (!existingFood) {
      return res.status(404).json({ error: 'Raw material not found' });
    }
    
    // Check if food is referenced in incoming lots
    const lotsCount = await getRow(
      'SELECT COUNT(*) as count FROM lot_in WHERE fk_food_in = ?',
      [foodId]
    );
    
    if (lotsCount.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete raw material: it is referenced in incoming lots' 
      });
    }
    
    // Check if food is referenced in sales
    const salesCount = await getRow(
      'SELECT COUNT(*) as count FROM sell WHERE fk_lot_in IN (SELECT id FROM lot_in WHERE fk_food_in = ?)',
      [foodId]
    );
    
    if (salesCount.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete raw material: it is referenced in sales' 
      });
    }
    
    await runQuery('DELETE FROM food_in WHERE id = ?', [foodId]);
    
    res.json({ message: 'Raw material deleted successfully' });
  } catch (error) {
    console.error('Error deleting raw material:', error);
    res.status(500).json({ error: 'Failed to delete raw material' });
  }
});

// Delete processed food
router.delete('/processed/:id', async (req, res) => {
  try {
    const foodId = req.params.id;
    
    // Check if food exists
    const existingFood = await getRow(
      'SELECT id FROM food_out WHERE id = ?',
      [foodId]
    );
    
    if (!existingFood) {
      return res.status(404).json({ error: 'Processed food not found' });
    }
    
    // Check if food is referenced in outgoing lots
    const lotsCount = await getRow(
      'SELECT COUNT(*) as count FROM lot_out WHERE fk_food_out = ?',
      [foodId]
    );
    
    if (lotsCount.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete processed food: it is referenced in outgoing lots' 
      });
    }
    
    // Check if food is referenced in sales
    const salesCount = await getRow(
      'SELECT COUNT(*) as count FROM sell WHERE fk_lot_out IN (SELECT id FROM lot_out WHERE fk_food_out = ?)',
      [foodId]
    );
    
    if (salesCount.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete processed food: it is referenced in sales' 
      });
    }
    
    await runQuery('DELETE FROM food_out WHERE id = ?', [foodId]);
    
    res.json({ message: 'Processed food deleted successfully' });
  } catch (error) {
    console.error('Error deleting processed food:', error);
    res.status(500).json({ error: 'Failed to delete processed food' });
  }
});

// Search foods
router.get('/search/:query', async (req, res) => {
  try {
    const query = `%${req.params.query}%`;
    const rawFoods = await getAll(
      'SELECT *, "raw" as type FROM food_in WHERE name LIKE ? ORDER BY name ASC',
      [query]
    );
    const processedFoods = await getAll(`
      SELECT 
        fo.*,
        g.code as gtin_code,
        "processed" as type
      FROM food_out fo
      LEFT JOIN gtin_13 g ON fo.fk_gtin = g.id
      WHERE fo.name LIKE ?
      ORDER BY fo.name ASC
    `, [query]);
    
    res.json({
      raw: rawFoods,
      processed: processedFoods,
      all: [...rawFoods, ...processedFoods]
    });
  } catch (error) {
    console.error('Error searching foods:', error);
    res.status(500).json({ error: 'Failed to search foods' });
  }
});

// Get measure units
router.get('/units', async (req, res) => {
  try {
    const units = await getAll('SELECT * FROM measure_unit ORDER BY name ASC');
    res.json(units);
  } catch (error) {
    console.error('Error fetching measure units:', error);
    res.status(500).json({ error: 'Failed to fetch measure units' });
  }
});

// Get GTIN codes
router.get('/gtin', async (req, res) => {
  try {
    const gtinCodes = await getAll('SELECT * FROM gtin_13 ORDER BY progressive ASC');
    res.json(gtinCodes);
  } catch (error) {
    console.error('Error fetching GTIN codes:', error);
    res.status(500).json({ error: 'Failed to fetch GTIN codes' });
  }
});

// =============================
// Processed Food Composition (Recipe) Endpoints
// =============================

// List composition (ingredients) for a processed food
router.get('/processed/:id/composition', async (req, res) => {
  try {
    const foodOutId = req.params.id;
    // Get all ingredient lots and quantities for this processed food
    const composition = await getAll(`
      SELECT 
        foc.fk_lot_in,
        foc.quantity,
        li.lot_number,
        li.acceptance_date,
        li.expiry_date,
        fi.id as food_in_id,
        fi.name as food_in_name,
        fi.unit_measure as food_in_unit,
        fi.source as food_in_source,
        fi.expiry_date as food_in_expiry
      FROM food_out_composition foc
      LEFT JOIN lot_in li ON foc.fk_lot_in = li.id
      LEFT JOIN food_in fi ON li.fk_food_in = fi.id
      WHERE foc.fk_food_out = ?
      ORDER BY li.acceptance_date DESC
    `, [foodOutId]);
    res.json(composition);
  } catch (error) {
    console.error('Error fetching processed food composition:', error);
    res.status(500).json({ error: 'Failed to fetch processed food composition' });
  }
});

// Add an ingredient lot to a processed food
router.post('/processed/:id/composition', async (req, res) => {
  try {
    const foodOutId = req.params.id;
    const { fk_lot_in, quantity } = req.body;
    if (!fk_lot_in || !quantity) {
      return res.status(400).json({ error: 'Required fields: fk_lot_in, quantity' });
    }
    // Check if already exists
    const existing = await getRow(
      'SELECT * FROM food_out_composition WHERE fk_food_out = ? AND fk_lot_in = ?',
      [foodOutId, fk_lot_in]
    );
    if (existing) {
      return res.status(400).json({ error: 'This ingredient lot is already in the recipe' });
    }
    // Check if lot exists
    const lot = await getRow('SELECT id FROM lot_in WHERE id = ?', [fk_lot_in]);
    if (!lot) {
      return res.status(404).json({ error: 'Ingredient lot not found' });
    }
    await runQuery(
      'INSERT INTO food_out_composition (fk_food_out, fk_lot_in, quantity) VALUES (?, ?, ?)',
      [foodOutId, fk_lot_in, quantity]
    );
    res.status(201).json({ message: 'Ingredient lot added to recipe' });
  } catch (error) {
    console.error('Error adding ingredient lot to recipe:', error);
    res.status(500).json({ error: 'Failed to add ingredient lot to recipe' });
  }
});

// Update the quantity of an ingredient lot in a processed food
router.put('/processed/:id/composition/:lotInId', async (req, res) => {
  try {
    const foodOutId = req.params.id;
    const lotInId = req.params.lotInId;
    const { quantity } = req.body;
    if (!quantity) {
      return res.status(400).json({ error: 'Required field: quantity' });
    }
    // Check if entry exists
    const existing = await getRow(
      'SELECT * FROM food_out_composition WHERE fk_food_out = ? AND fk_lot_in = ?',
      [foodOutId, lotInId]
    );
    if (!existing) {
      return res.status(404).json({ error: 'Ingredient lot not found in recipe' });
    }
    await runQuery(
      'UPDATE food_out_composition SET quantity = ? WHERE fk_food_out = ? AND fk_lot_in = ?',
      [quantity, foodOutId, lotInId]
    );
    res.json({ message: 'Ingredient lot quantity updated' });
  } catch (error) {
    console.error('Error updating ingredient lot quantity:', error);
    res.status(500).json({ error: 'Failed to update ingredient lot quantity' });
  }
});

// Remove an ingredient lot from a processed food
router.delete('/processed/:id/composition/:lotInId', async (req, res) => {
  try {
    const foodOutId = req.params.id;
    const lotInId = req.params.lotInId;
    // Check if entry exists
    const existing = await getRow(
      'SELECT * FROM food_out_composition WHERE fk_food_out = ? AND fk_lot_in = ?',
      [foodOutId, lotInId]
    );
    if (!existing) {
      return res.status(404).json({ error: 'Ingredient lot not found in recipe' });
    }
    await runQuery(
      'DELETE FROM food_out_composition WHERE fk_food_out = ? AND fk_lot_in = ?',
      [foodOutId, lotInId]
    );
    res.json({ message: 'Ingredient lot removed from recipe' });
  } catch (error) {
    console.error('Error removing ingredient lot from recipe:', error);
    res.status(500).json({ error: 'Failed to remove ingredient lot from recipe' });
  }
});

module.exports = router; 