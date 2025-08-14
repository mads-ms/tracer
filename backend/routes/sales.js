import { Hono } from 'hono';

const router = new Hono();

// Get all sales
router.get('/', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const sales = await database.getAll(`
      SELECT 
        s.*,
        c.name as customer_name,
        c.vat as customer_vat
      FROM sell s
      LEFT JOIN customer c ON s.fk_customer = c.id
      ORDER BY s.invoice_date DESC
    `);
    return c.json(sales);
  } catch (error) {
    console.error('Error fetching sales:', error);
    return c.json({ error: 'Failed to fetch sales' }, 500);
  }
});

// Get sale by ID
router.get('/:id', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const sale = await database.getRow(`
      SELECT 
        s.*,
        c.name as customer_name,
        c.vat as customer_vat,
        c.address as customer_address,
        c.city as customer_city
      FROM sell s
      LEFT JOIN customer c ON s.fk_customer = c.id
      WHERE s.id = ?
    `, [c.req.param('id')]);
    
    if (!sale) {
      return c.json({ error: 'Sale not found' }, 404);
    }
    return c.json(sale);
  } catch (error) {
    console.error('Error fetching sale:', error);
    return c.json({ error: 'Failed to fetch sale' }, 500);
  }
});

// Create new sale
router.post('/', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const body = await c.req.json();
    const { 
      invoice_number, 
      invoice_date, 
      fk_lot_out, 
      fk_lot_in, 
      fk_package, 
      fk_customer 
    } = body;
    
    // Validate required fields
    if (!invoice_number || !invoice_date || !fk_customer) {
      return c.json({ error: 'Invoice number, date, and customer are required' }, 400);
    }

    // Check if invoice number already exists
    const existingInvoice = await database.getRow('SELECT id FROM sell WHERE invoice_number = ?', [invoice_number]);
    if (existingInvoice) {
      return c.json({ error: 'Invoice number already exists' }, 400);
    }

    // Check if customer exists
    const customer = await database.getRow('SELECT id FROM customer WHERE id = ?', [fk_customer]);
    if (!customer) {
      return c.json({ error: 'Customer not found' }, 400);
    }

    // Check if lot_out exists (if provided)
    if (fk_lot_out) {
      const lotOut = await database.getRow('SELECT id FROM lot_out WHERE id = ?', [fk_lot_out]);
      if (!lotOut) {
        return c.json({ error: 'Outgoing lot not found' }, 400);
      }
    }

    // Check if lot_in exists (if provided)
    if (fk_lot_in) {
      const lotIn = await database.getRow('SELECT id FROM lot_in WHERE id = ?', [fk_lot_in]);
      if (!lotIn) {
        return c.json({ error: 'Incoming lot not found' }, 400);
      }
    }

    // Check if package exists (if provided)
    if (fk_package) {
      const packageItem = await database.getRow('SELECT id FROM package WHERE id = ?', [fk_package]);
      if (!packageItem) {
        return c.json({ error: 'Package not found' }, 400);
      }
    }

    const result = await database.runQuery(
      'INSERT INTO sell (invoice_number, invoice_date, fk_lot_out, fk_lot_in, fk_package, fk_customer) VALUES (?, ?, ?, ?, ?, ?)',
      [invoice_number, invoice_date, fk_lot_out || null, fk_lot_in || null, fk_package || null, fk_customer]
    );

    // Check if we got a valid result
    if (!result || !result.id) {
      // If we can't get the ID, try to fetch the sale by invoice_number
      const newSale = await database.getRow(
        'SELECT * FROM sell WHERE invoice_number = ? ORDER BY created_at DESC LIMIT 1',
        [invoice_number]
      );
      if (newSale) {
        return c.json(newSale, 201);
      } else {
        return c.json({ 
          message: 'Sale created successfully but could not retrieve details',
          success: true 
        }, 201);
      }
    }

    const newSale = await database.getRow(`
      SELECT 
        s.*,
        c.name as customer_name,
        c.vat as customer_vat
      FROM sell s
      LEFT JOIN customer c ON s.fk_customer = c.id
      WHERE s.id = ?
    `, [result.id]);
    
    return c.json(newSale, 201);
  } catch (error) {
    console.error('Error creating sale:', error);
    return c.json({ error: 'Failed to create sale' }, 500);
  }
});

// Update sale
router.put('/:id', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const body = await c.req.json();
    const { 
      invoice_number, 
      invoice_date, 
      fk_lot_out, 
      fk_lot_in, 
      fk_package, 
      fk_customer 
    } = body;
    const saleId = c.req.param('id');

    // Validate required fields
    if (!invoice_number || !invoice_date || !fk_customer) {
      return c.json({ error: 'Invoice number, date, and customer are required' }, 400);
    }

    // Check if sale exists
    const existingSale = await database.getRow('SELECT id FROM sell WHERE id = ?', [saleId]);
    if (!existingSale) {
      return c.json({ error: 'Sale not found' }, 404);
    }

    // Check if invoice number already exists for another sale
    const duplicateInvoice = await database.getRow('SELECT id FROM sell WHERE invoice_number = ? AND id != ?', [invoice_number, saleId]);
    if (duplicateInvoice) {
      return c.json({ error: 'Invoice number already exists' }, 400);
    }

    // Check if customer exists
    const customer = await database.getRow('SELECT id FROM customer WHERE id = ?', [fk_customer]);
    if (!customer) {
      return c.json({ error: 'Customer not found' }, 400);
    }

    // Check if lot_out exists (if provided)
    if (fk_lot_out) {
      const lotOut = await database.getRow('SELECT id FROM lot_out WHERE id = ?', [fk_lot_out]);
      if (!lotOut) {
        return c.json({ error: 'Outgoing lot not found' }, 400);
      }
    }

    // Check if lot_in exists (if provided)
    if (fk_lot_in) {
      const lotIn = await database.getRow('SELECT id FROM lot_in WHERE id = ?', [fk_lot_in]);
      if (!lotIn) {
        return c.json({ error: 'Incoming lot not found' }, 400);
      }
    }

    // Check if package exists (if provided)
    if (fk_package) {
      const packageItem = await database.getRow('SELECT id FROM package WHERE id = ?', [fk_package]);
      if (!packageItem) {
        return c.json({ error: 'Package not found' }, 400);
      }
    }

    await database.runQuery(
      'UPDATE sell SET invoice_number = ?, invoice_date = ?, fk_lot_out = ?, fk_lot_in = ?, fk_package = ?, fk_customer = ? WHERE id = ?',
      [invoice_number, invoice_date, fk_lot_out || null, fk_lot_in || null, fk_package || null, fk_customer, saleId]
    );

    const updatedSale = await database.getRow(`
      SELECT 
        s.*,
        c.name as customer_name,
        c.vat as customer_vat
      FROM sell s
      LEFT JOIN customer c ON s.fk_customer = c.id
      WHERE s.id = ?
    `, [saleId]);
    
    return c.json(updatedSale);
  } catch (error) {
    console.error('Error updating sale:', error);
    return c.json({ error: 'Failed to update sale' }, 500);
  }
});

// Delete sale
router.delete('/:id', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const saleId = c.req.param('id');

    // Check if sale exists
    const existingSale = await database.getRow('SELECT id FROM sell WHERE id = ?', [saleId]);
    if (!existingSale) {
      return c.json({ error: 'Sale not found' }, 404);
    }

    await database.runQuery('DELETE FROM sell WHERE id = ?', [saleId]);
    return c.json({ message: 'Sale deleted successfully' });
  } catch (error) {
    console.error('Error deleting sale:', error);
    return c.json({ error: 'Failed to delete sale' }, 500);
  }
});

// Get sales statistics for dashboard
router.get('/stats/summary', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    // Get total sales count
    const totalSalesResult = await database.getRow('SELECT COUNT(*) as count FROM sell');
    const totalSales = totalSalesResult.count || 0;
    
    // Get total sales by month (current year)
    const monthlySalesResult = await database.getAll(`
      SELECT 
        strftime('%m', invoice_date) as month,
        COUNT(*) as count
      FROM sell 
      WHERE strftime('%Y', invoice_date) = strftime('%Y', 'now')
      GROUP BY month
      ORDER BY month
    `);
    const monthlySales = monthlySalesResult || [];
    
    // Get sales by customer count
    const customersCountResult = await database.getRow('SELECT COUNT(DISTINCT fk_customer) as count FROM sell');
    const customersCount = customersCountResult.count || 0;
    
    // Get recent sales (last 5)
    const recentSalesResult = await database.getAll(`
      SELECT 
        s.*,
        c.name as customer_name
      FROM sell s
      LEFT JOIN customer c ON s.fk_customer = c.id
      ORDER BY s.created_at DESC
      LIMIT 5
    `);
    const recentSales = recentSalesResult || [];
    
    return c.json({
      totalSales,
      monthlySales,
      customersCount,
      recentSales
    });
  } catch (error) {
    console.error('Error fetching sales stats:', error);
    return c.json({ error: 'Failed to fetch sales statistics' }, 500);
  }
});

export default router; 