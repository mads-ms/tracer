const express = require('express');
const router = express.Router();
const { runQuery, getRow, getAll } = require('../database/database');

// Get all sales with detailed information
router.get('/', async (req, res) => {
  try {
    const sales = await getAll(`
      SELECT 
        s.*,
        c.name as customer_name,
        c.vat as customer_vat,
        c.city as customer_city,
        lo.lot_number as lot_out_number,
        lo.creation_date as lot_out_creation_date,
        fo.name as lot_out_food_name,
        li.lot_number as lot_in_number,
        li.acceptance_date as lot_in_acceptance_date,
        fi.name as lot_in_food_name,
        p.type as package_type,
        p.description as package_description,
        p.measure as package_measure
      FROM sell s
      LEFT JOIN customer c ON s.fk_customer = c.id
      LEFT JOIN lot_out lo ON s.fk_lot_out = lo.id
      LEFT JOIN food_out fo ON lo.fk_food_out = fo.id
      LEFT JOIN lot_in li ON s.fk_lot_in = li.id
      LEFT JOIN food_in fi ON li.fk_food_in = fi.id
      LEFT JOIN package p ON s.fk_package = p.id
      ORDER BY s.invoice_date DESC, s.invoice_number DESC
    `);
    res.json(sales);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

// Get sale by ID
router.get('/:id', async (req, res) => {
  try {
    const sale = await getRow(`
      SELECT 
        s.*,
        c.name as customer_name,
        c.vat as customer_vat,
        c.address as customer_address,
        c.cap as customer_cap,
        c.city as customer_city,
        c.phone as customer_phone,
        lo.lot_number as lot_out_number,
        lo.creation_date as lot_out_creation_date,
        lo.expiry_date as lot_out_expiry_date,
        lo.quantity_of_food as lot_out_quantity,
        fo.name as lot_out_food_name,
        fo.unit_measure as lot_out_unit_measure,
        g_out.code as lot_out_gtin_code,
        li.lot_number as lot_in_number,
        li.acceptance_date as lot_in_acceptance_date,
        li.ddt_number as lot_in_ddt_number,
        li.quantity as lot_in_quantity,
        fi.name as lot_in_food_name,
        fi.unit_measure as lot_in_unit_measure,
        fi.source as lot_in_source,
        s_in.name as lot_in_supplier_name,
        p.type as package_type,
        p.description as package_description,
        p.measure as package_measure,
        g_pkg.code as package_gtin_code
      FROM sell s
      LEFT JOIN customer c ON s.fk_customer = c.id
      LEFT JOIN lot_out lo ON s.fk_lot_out = lo.id
      LEFT JOIN food_out fo ON lo.fk_food_out = fo.id
      LEFT JOIN gtin_13 g_out ON fo.fk_gtin = g_out.id
      LEFT JOIN lot_in li ON s.fk_lot_in = li.id
      LEFT JOIN food_in fi ON li.fk_food_in = fi.id
      LEFT JOIN supplier s_in ON li.fk_supplier = s_in.id
      LEFT JOIN package p ON s.fk_package = p.id
      LEFT JOIN gtin_13 g_pkg ON p.fk_gtin = g_pkg.id
      WHERE s.id = ?
    `, [req.params.id]);
    
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    res.json(sale);
  } catch (error) {
    console.error('Error fetching sale:', error);
    res.status(500).json({ error: 'Failed to fetch sale' });
  }
});

// Create new sale
router.post('/', async (req, res) => {
  try {
    const {
      invoice_number,
      invoice_date,
      fk_lot_out,
      fk_lot_in,
      fk_package,
      fk_customer
    } = req.body;
    
    // Validation
    if (!invoice_number || !invoice_date || !fk_customer) {
      return res.status(400).json({ 
        error: 'Required fields: invoice_number, invoice_date, fk_customer' 
      });
    }
    
    // At least one product must be specified
    if (!fk_lot_out && !fk_lot_in && !fk_package) {
      return res.status(400).json({ 
        error: 'At least one product must be specified: fk_lot_out, fk_lot_in, or fk_package' 
      });
    }
    
    // Check if invoice number already exists
    const existingInvoice = await getRow(
      'SELECT id FROM sell WHERE invoice_number = ?',
      [invoice_number]
    );
    
    if (existingInvoice) {
      return res.status(400).json({ error: 'Invoice number already exists' });
    }
    
    // Check if customer exists
    const customer = await getRow(
      'SELECT id FROM customer WHERE id = ?',
      [fk_customer]
    );
    
    if (!customer) {
      return res.status(400).json({ error: 'Customer not found' });
    }
    
    // Check if lot_out exists (if provided)
    if (fk_lot_out) {
      const lotOut = await getRow(
        'SELECT id FROM lot_out WHERE id = ?',
        [fk_lot_out]
      );
      
      if (!lotOut) {
        return res.status(400).json({ error: 'Outgoing lot not found' });
      }
    }
    
    // Check if lot_in exists (if provided)
    if (fk_lot_in) {
      const lotIn = await getRow(
        'SELECT id FROM lot_in WHERE id = ?',
        [fk_lot_in]
      );
      
      if (!lotIn) {
        return res.status(400).json({ error: 'Incoming lot not found' });
      }
    }
    
    // Check if package exists (if provided)
    if (fk_package) {
      const package = await getRow(
        'SELECT id FROM package WHERE id = ?',
        [fk_package]
      );
      
      if (!package) {
        return res.status(400).json({ error: 'Package not found' });
      }
    }
    
    const result = await runQuery(
      `INSERT INTO sell (
        invoice_number, invoice_date, fk_lot_out, fk_lot_in, fk_package, fk_customer
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [invoice_number, invoice_date, fk_lot_out || null, fk_lot_in || null, fk_package || null, fk_customer]
    );
    
    const newSale = await getRow(`
      SELECT 
        s.*,
        c.name as customer_name,
        c.vat as customer_vat,
        c.city as customer_city,
        lo.lot_number as lot_out_number,
        lo.creation_date as lot_out_creation_date,
        fo.name as lot_out_food_name,
        li.lot_number as lot_in_number,
        li.acceptance_date as lot_in_acceptance_date,
        fi.name as lot_in_food_name,
        p.type as package_type,
        p.description as package_description,
        p.measure as package_measure
      FROM sell s
      LEFT JOIN customer c ON s.fk_customer = c.id
      LEFT JOIN lot_out lo ON s.fk_lot_out = lo.id
      LEFT JOIN food_out fo ON lo.fk_food_out = fo.id
      LEFT JOIN lot_in li ON s.fk_lot_in = li.id
      LEFT JOIN food_in fi ON li.fk_food_in = fi.id
      LEFT JOIN package p ON s.fk_package = p.id
      WHERE s.id = ?
    `, [result.lastID]);
    
    res.status(201).json(newSale);
  } catch (error) {
    console.error('Error creating sale:', error);
    res.status(500).json({ error: 'Failed to create sale' });
  }
});

// Update sale
router.put('/:id', async (req, res) => {
  try {
    const {
      invoice_number,
      invoice_date,
      fk_lot_out,
      fk_lot_in,
      fk_package,
      fk_customer
    } = req.body;
    const saleId = req.params.id;
    
    // Validation
    if (!invoice_number || !invoice_date || !fk_customer) {
      return res.status(400).json({ 
        error: 'Required fields: invoice_number, invoice_date, fk_customer' 
      });
    }
    
    // At least one product must be specified
    if (!fk_lot_out && !fk_lot_in && !fk_package) {
      return res.status(400).json({ 
        error: 'At least one product must be specified: fk_lot_out, fk_lot_in, or fk_package' 
      });
    }
    
    // Check if sale exists
    const existingSale = await getRow(
      'SELECT id FROM sell WHERE id = ?',
      [saleId]
    );
    
    if (!existingSale) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    // Check if invoice number already exists for another sale
    const duplicateInvoice = await getRow(
      'SELECT id FROM sell WHERE invoice_number = ? AND id != ?',
      [invoice_number, saleId]
    );
    
    if (duplicateInvoice) {
      return res.status(400).json({ error: 'Invoice number already exists' });
    }
    
    // Check if customer exists
    const customer = await getRow(
      'SELECT id FROM customer WHERE id = ?',
      [fk_customer]
    );
    
    if (!customer) {
      return res.status(400).json({ error: 'Customer not found' });
    }
    
    // Check if lot_out exists (if provided)
    if (fk_lot_out) {
      const lotOut = await getRow(
        'SELECT id FROM lot_out WHERE id = ?',
        [fk_lot_out]
      );
      
      if (!lotOut) {
        return res.status(400).json({ error: 'Outgoing lot not found' });
      }
    }
    
    // Check if lot_in exists (if provided)
    if (fk_lot_in) {
      const lotIn = await getRow(
        'SELECT id FROM lot_in WHERE id = ?',
        [fk_lot_in]
      );
      
      if (!lotIn) {
        return res.status(400).json({ error: 'Incoming lot not found' });
      }
    }
    
    // Check if package exists (if provided)
    if (fk_package) {
      const package = await getRow(
        'SELECT id FROM package WHERE id = ?',
        [fk_package]
      );
      
      if (!package) {
        return res.status(400).json({ error: 'Package not found' });
      }
    }
    
    await runQuery(
      `UPDATE sell SET 
        invoice_number = ?, invoice_date = ?, fk_lot_out = ?, 
        fk_lot_in = ?, fk_package = ?, fk_customer = ?
       WHERE id = ?`,
      [invoice_number, invoice_date, fk_lot_out || null, fk_lot_in || null, fk_package || null, fk_customer, saleId]
    );
    
    const updatedSale = await getRow(`
      SELECT 
        s.*,
        c.name as customer_name,
        c.vat as customer_vat,
        c.city as customer_city,
        lo.lot_number as lot_out_number,
        lo.creation_date as lot_out_creation_date,
        fo.name as lot_out_food_name,
        li.lot_number as lot_in_number,
        li.acceptance_date as lot_in_acceptance_date,
        fi.name as lot_in_food_name,
        p.type as package_type,
        p.description as package_description,
        p.measure as package_measure
      FROM sell s
      LEFT JOIN customer c ON s.fk_customer = c.id
      LEFT JOIN lot_out lo ON s.fk_lot_out = lo.id
      LEFT JOIN food_out fo ON lo.fk_food_out = fo.id
      LEFT JOIN lot_in li ON s.fk_lot_in = li.id
      LEFT JOIN food_in fi ON li.fk_food_in = fi.id
      LEFT JOIN package p ON s.fk_package = p.id
      WHERE s.id = ?
    `, [saleId]);
    
    res.json(updatedSale);
  } catch (error) {
    console.error('Error updating sale:', error);
    res.status(500).json({ error: 'Failed to update sale' });
  }
});

// Delete sale
router.delete('/:id', async (req, res) => {
  try {
    const saleId = req.params.id;
    
    // Check if sale exists
    const existingSale = await getRow(
      'SELECT id FROM sell WHERE id = ?',
      [saleId]
    );
    
    if (!existingSale) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    await runQuery('DELETE FROM sell WHERE id = ?', [saleId]);
    
    res.json({ message: 'Sale deleted successfully' });
  } catch (error) {
    console.error('Error deleting sale:', error);
    res.status(500).json({ error: 'Failed to delete sale' });
  }
});

// Search sales
router.get('/search/:query', async (req, res) => {
  try {
    const query = `%${req.params.query}%`;
    const sales = await getAll(`
      SELECT 
        s.*,
        c.name as customer_name,
        c.vat as customer_vat,
        c.city as customer_city,
        lo.lot_number as lot_out_number,
        lo.creation_date as lot_out_creation_date,
        fo.name as lot_out_food_name,
        li.lot_number as lot_in_number,
        li.acceptance_date as lot_in_acceptance_date,
        fi.name as lot_in_food_name,
        p.type as package_type,
        p.description as package_description,
        p.measure as package_measure
      FROM sell s
      LEFT JOIN customer c ON s.fk_customer = c.id
      LEFT JOIN lot_out lo ON s.fk_lot_out = lo.id
      LEFT JOIN food_out fo ON lo.fk_food_out = fo.id
      LEFT JOIN lot_in li ON s.fk_lot_in = li.id
      LEFT JOIN food_in fi ON li.fk_food_in = fi.id
      LEFT JOIN package p ON s.fk_package = p.id
      WHERE s.invoice_number LIKE ? OR c.name LIKE ? OR c.vat LIKE ? OR 
            lo.lot_number LIKE ? OR li.lot_number LIKE ? OR fo.name LIKE ? OR fi.name LIKE ?
      ORDER BY s.invoice_date DESC, s.invoice_number DESC
    `, [query, query, query, query, query, query, query]);
    
    res.json(sales);
  } catch (error) {
    console.error('Error searching sales:', error);
    res.status(500).json({ error: 'Failed to search sales' });
  }
});

// Get sales by customer
router.get('/customer/:customerId', async (req, res) => {
  try {
    const customerId = req.params.customerId;
    
    // Check if customer exists
    const customer = await getRow(
      'SELECT id FROM customer WHERE id = ?',
      [customerId]
    );
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    const sales = await getAll(`
      SELECT 
        s.*,
        c.name as customer_name,
        c.vat as customer_vat,
        c.city as customer_city,
        lo.lot_number as lot_out_number,
        lo.creation_date as lot_out_creation_date,
        fo.name as lot_out_food_name,
        li.lot_number as lot_in_number,
        li.acceptance_date as lot_in_acceptance_date,
        fi.name as lot_in_food_name,
        p.type as package_type,
        p.description as package_description,
        p.measure as package_measure
      FROM sell s
      LEFT JOIN customer c ON s.fk_customer = c.id
      LEFT JOIN lot_out lo ON s.fk_lot_out = lo.id
      LEFT JOIN food_out fo ON lo.fk_food_out = fo.id
      LEFT JOIN lot_in li ON s.fk_lot_in = li.id
      LEFT JOIN food_in fi ON li.fk_food_in = fi.id
      LEFT JOIN package p ON s.fk_package = p.id
      WHERE s.fk_customer = ?
      ORDER BY s.invoice_date DESC, s.invoice_number DESC
    `, [customerId]);
    
    res.json(sales);
  } catch (error) {
    console.error('Error fetching sales by customer:', error);
    res.status(500).json({ error: 'Failed to fetch sales by customer' });
  }
});

// Get sales by date range
router.get('/date-range/:startDate/:endDate', async (req, res) => {
  try {
    const { startDate, endDate } = req.params;
    
    const sales = await getAll(`
      SELECT 
        s.*,
        c.name as customer_name,
        c.vat as customer_vat,
        c.city as customer_city,
        lo.lot_number as lot_out_number,
        lo.creation_date as lot_out_creation_date,
        fo.name as lot_out_food_name,
        li.lot_number as lot_in_number,
        li.acceptance_date as lot_in_acceptance_date,
        fi.name as lot_in_food_name,
        p.type as package_type,
        p.description as package_description,
        p.measure as package_measure
      FROM sell s
      LEFT JOIN customer c ON s.fk_customer = c.id
      LEFT JOIN lot_out lo ON s.fk_lot_out = lo.id
      LEFT JOIN food_out fo ON lo.fk_food_out = fo.id
      LEFT JOIN lot_in li ON s.fk_lot_in = li.id
      LEFT JOIN food_in fi ON li.fk_food_in = fi.id
      LEFT JOIN package p ON s.fk_package = p.id
      WHERE s.invoice_date BETWEEN ? AND ?
      ORDER BY s.invoice_date DESC, s.invoice_number DESC
    `, [startDate, endDate]);
    
    res.json(sales);
  } catch (error) {
    console.error('Error fetching sales by date range:', error);
    res.status(500).json({ error: 'Failed to fetch sales by date range' });
  }
});

// Get next invoice number
router.get('/next-invoice-number', async (req, res) => {
  try {
    const lastSale = await getRow(`
      SELECT invoice_number FROM sell 
      ORDER BY CAST(invoice_number AS INTEGER) DESC 
      LIMIT 1
    `);
    
    let nextNumber = 1;
    if (lastSale && lastSale.invoice_number) {
      nextNumber = parseInt(lastSale.invoice_number) + 1;
    }
    
    res.json({ 
      nextInvoiceNumber: nextNumber.toString().padStart(6, '0')
    });
  } catch (error) {
    console.error('Error generating next invoice number:', error);
    res.status(500).json({ error: 'Failed to generate next invoice number' });
  }
});

// Get sales statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const totalSales = await getRow('SELECT COUNT(*) as count FROM sell');
    const salesToday = await getRow(`
      SELECT COUNT(*) as count FROM sell 
      WHERE invoice_date = date('now')
    `);
    const salesThisMonth = await getRow(`
      SELECT COUNT(*) as count FROM sell 
      WHERE strftime('%Y-%m', invoice_date) = strftime('%Y-%m', 'now')
    `);
    const uniqueCustomers = await getRow(`
      SELECT COUNT(DISTINCT fk_customer) as count FROM sell
    `);
    
    res.json({
      totalSales: totalSales.count,
      salesToday: salesToday.count,
      salesThisMonth: salesThisMonth.count,
      uniqueCustomers: uniqueCustomers.count
    });
  } catch (error) {
    console.error('Error fetching sales statistics:', error);
    res.status(500).json({ error: 'Failed to fetch sales statistics' });
  }
});

// Get sales by product type
router.get('/stats/by-product-type', async (req, res) => {
  try {
    const stats = await getAll(`
      SELECT 
        CASE 
          WHEN fk_lot_out IS NOT NULL THEN 'Processed Food'
          WHEN fk_lot_in IS NOT NULL THEN 'Raw Material'
          WHEN fk_package IS NOT NULL THEN 'Package'
          ELSE 'Unknown'
        END as product_type,
        COUNT(*) as count
      FROM sell
      GROUP BY product_type
      ORDER BY count DESC
    `);
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching sales by product type:', error);
    res.status(500).json({ error: 'Failed to fetch sales by product type' });
  }
});

module.exports = router; 