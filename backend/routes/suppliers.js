const express = require('express');
const router = express.Router();
const { runQuery, getRow, getAll } = require('../database/database');

// Get all suppliers
router.get('/', async (req, res) => {
  try {
    const suppliers = await getAll('SELECT * FROM supplier ORDER BY name');
    res.json(suppliers);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

// Get supplier by ID
router.get('/:id', async (req, res) => {
  try {
    const supplier = await getRow('SELECT * FROM supplier WHERE id = ?', [req.params.id]);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    res.json(supplier);
  } catch (error) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({ error: 'Failed to fetch supplier' });
  }
});

// Create new supplier
router.post('/', async (req, res) => {
  try {
    const { vat, name, address, phone } = req.body;
    
    // Validate required fields
    if (!vat || !name) {
      return res.status(400).json({ error: 'VAT and name are required' });
    }

    // Check if VAT already exists
    const existingSupplier = await getRow('SELECT id FROM supplier WHERE vat = ?', [vat]);
    if (existingSupplier) {
      return res.status(400).json({ error: 'Supplier with this VAT already exists' });
    }

    const result = await runQuery(
      'INSERT INTO supplier (vat, name, address, phone) VALUES (?, ?, ?, ?)',
      [vat, name, address || null, phone || null]
    );

    const newSupplier = await getRow('SELECT * FROM supplier WHERE id = ?', [result.id]);
    res.status(201).json(newSupplier);
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ error: 'Failed to create supplier' });
  }
});

// Update supplier
router.put('/:id', async (req, res) => {
  try {
    const { vat, name, address, phone } = req.body;
    const supplierId = req.params.id;

    // Validate required fields
    if (!vat || !name) {
      return res.status(400).json({ error: 'VAT and name are required' });
    }

    // Check if supplier exists
    const existingSupplier = await getRow('SELECT id FROM supplier WHERE id = ?', [supplierId]);
    if (!existingSupplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    // Check if VAT already exists for another supplier
    const duplicateVat = await getRow('SELECT id FROM supplier WHERE vat = ? AND id != ?', [vat, supplierId]);
    if (duplicateVat) {
      return res.status(400).json({ error: 'Supplier with this VAT already exists' });
    }

    await runQuery(
      'UPDATE supplier SET vat = ?, name = ?, address = ?, phone = ? WHERE id = ?',
      [vat, name, address || null, phone || null, supplierId]
    );

    const updatedSupplier = await getRow('SELECT * FROM supplier WHERE id = ?', [supplierId]);
    res.json(updatedSupplier);
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({ error: 'Failed to update supplier' });
  }
});

// Delete supplier
router.delete('/:id', async (req, res) => {
  try {
    const supplierId = req.params.id;

    // Check if supplier exists
    const existingSupplier = await getRow('SELECT id FROM supplier WHERE id = ?', [supplierId]);
    if (!existingSupplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    // Check if supplier is used in any lots
    const usedInLots = await getRow(
      'SELECT COUNT(*) as count FROM lot_in WHERE fk_supplier = ?',
      [supplierId]
    );

    if (usedInLots.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete supplier. They have associated incoming lots.' 
      });
    }

    await runQuery('DELETE FROM supplier WHERE id = ?', [supplierId]);
    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
});

// Search suppliers
router.get('/search/:query', async (req, res) => {
  try {
    const query = `%${req.params.query}%`;
    const suppliers = await getAll(
      'SELECT * FROM supplier WHERE name LIKE ? OR vat LIKE ? OR address LIKE ? ORDER BY name',
      [query, query, query]
    );
    res.json(suppliers);
  } catch (error) {
    console.error('Error searching suppliers:', error);
    res.status(500).json({ error: 'Failed to search suppliers' });
  }
});

// Get supplier statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const totalSuppliers = await getRow('SELECT COUNT(*) as count FROM supplier');
    const suppliersWithLots = await getRow(
      'SELECT COUNT(DISTINCT fk_supplier) as count FROM lot_in'
    );
    
    res.json({
      totalSuppliers: totalSuppliers.count,
      suppliersWithLots: suppliersWithLots.count,
      suppliersWithoutLots: totalSuppliers.count - suppliersWithLots.count
    });
  } catch (error) {
    console.error('Error fetching supplier statistics:', error);
    res.status(500).json({ error: 'Failed to fetch supplier statistics' });
  }
});

module.exports = router; 