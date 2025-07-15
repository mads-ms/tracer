const express = require('express');
const router = express.Router();
const { runQuery, getRow, getAll } = require('../database/database');

// Get all customers
router.get('/', async (req, res) => {
  try {
    const customers = await getAll(`
      SELECT * FROM customer 
      ORDER BY name ASC
    `);
    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Get customer by ID
router.get('/:id', async (req, res) => {
  try {
    const customer = await getRow(
      'SELECT * FROM customer WHERE id = ?',
      [req.params.id]
    );
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json(customer);
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// Create new customer
router.post('/', async (req, res) => {
  try {
    const { vat, name, address, cap, city, phone } = req.body;
    
    // Validation
    if (!vat || !name || !address || !cap || !city || !phone) {
      return res.status(400).json({ 
        error: 'All fields are required: vat, name, address, cap, city, phone' 
      });
    }
    
    // Check if VAT already exists
    const existingCustomer = await getRow(
      'SELECT id FROM customer WHERE vat = ?',
      [vat]
    );
    
    if (existingCustomer) {
      return res.status(400).json({ error: 'Customer with this VAT already exists' });
    }
    
    const result = await runQuery(
      `INSERT INTO customer (vat, name, address, cap, city, phone) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [vat, name, address, cap, city, phone]
    );
    
    const newCustomer = await getRow(
      'SELECT * FROM customer WHERE id = ?',
      [result.lastID]
    );
    
    res.status(201).json(newCustomer);
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// Update customer
router.put('/:id', async (req, res) => {
  try {
    const { vat, name, address, cap, city, phone } = req.body;
    const customerId = req.params.id;
    
    // Validation
    if (!vat || !name || !address || !cap || !city || !phone) {
      return res.status(400).json({ 
        error: 'All fields are required: vat, name, address, cap, city, phone' 
      });
    }
    
    // Check if customer exists
    const existingCustomer = await getRow(
      'SELECT id FROM customer WHERE id = ?',
      [customerId]
    );
    
    if (!existingCustomer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Check if VAT already exists for another customer
    const duplicateVat = await getRow(
      'SELECT id FROM customer WHERE vat = ? AND id != ?',
      [vat, customerId]
    );
    
    if (duplicateVat) {
      return res.status(400).json({ error: 'Customer with this VAT already exists' });
    }
    
    await runQuery(
      `UPDATE customer 
       SET vat = ?, name = ?, address = ?, cap = ?, city = ?, phone = ?
       WHERE id = ?`,
      [vat, name, address, cap, city, phone, customerId]
    );
    
    const updatedCustomer = await getRow(
      'SELECT * FROM customer WHERE id = ?',
      [customerId]
    );
    
    res.json(updatedCustomer);
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// Delete customer
router.delete('/:id', async (req, res) => {
  try {
    const customerId = req.params.id;
    
    // Check if customer exists
    const existingCustomer = await getRow(
      'SELECT id FROM customer WHERE id = ?',
      [customerId]
    );
    
    if (!existingCustomer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Check if customer is referenced in sales
    const salesCount = await getRow(
      'SELECT COUNT(*) as count FROM sell WHERE fk_customer = ?',
      [customerId]
    );
    
    if (salesCount.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete customer: they have associated sales records' 
      });
    }
    
    await runQuery('DELETE FROM customer WHERE id = ?', [customerId]);
    
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

// Search customers
router.get('/search/:query', async (req, res) => {
  try {
    const query = `%${req.params.query}%`;
    const customers = await getAll(`
      SELECT * FROM customer 
      WHERE name LIKE ? OR vat LIKE ? OR city LIKE ?
      ORDER BY name ASC
    `, [query, query, query]);
    
    res.json(customers);
  } catch (error) {
    console.error('Error searching customers:', error);
    res.status(500).json({ error: 'Failed to search customers' });
  }
});

module.exports = router; 