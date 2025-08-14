import { Hono } from 'hono';

const router = new Hono();

// Get all customers
router.get('/', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const customers = await database.getAll('SELECT * FROM customer ORDER BY name');
    return c.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return c.json({ error: 'Failed to fetch customers' }, 500);
  }
});

// Get customer by ID
router.get('/:id', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const customer = await database.getRow('SELECT * FROM customer WHERE id = ?', [c.req.param('id')]);
    if (!customer) {
      return c.json({ error: 'Customer not found' }, 404);
    }
    return c.json(customer);
  } catch (error) {
    console.error('Error fetching customer:', error);
    return c.json({ error: 'Failed to fetch customer' }, 500);
  }
});

// Create new customer
router.post('/', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const body = await c.req.json();
    const { name, vat, address, city, country, phone, email, website } = body;
    
    // Validate required fields
    if (!name) {
      return c.json({ error: 'Name is required' }, 400);
    }

    // Check if VAT already exists (if provided)
    if (vat) {
      const existingCustomer = await database.getRow('SELECT id FROM customer WHERE vat = ?', [vat]);
      if (existingCustomer) {
        return c.json({ error: 'Customer with this VAT already exists' }, 400);
      }
    }

    const result = await database.runQuery(
      'INSERT INTO customer (name, vat, address, city, country, phone, email, website) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, vat || null, address || null, city || null, country || null, phone || null, email || null, website || null]
    );

    // Check if we got a valid result
    if (!result || !result.id) {
      // If we can't get the ID, try to fetch the customer by name and VAT
      const newCustomer = await database.getRow(
        'SELECT * FROM customer WHERE name = ? AND vat = ? ORDER BY created_at DESC LIMIT 1',
        [name, vat || null]
      );
      if (newCustomer) {
        return c.json(newCustomer, 201);
      } else {
        return c.json({ 
          message: 'Customer created successfully but could not retrieve details',
          success: true 
        }, 201);
      }
    }

    const newCustomer = await database.getRow('SELECT * FROM customer WHERE id = ?', [result.id]);
    return c.json(newCustomer, 201);
  } catch (error) {
    console.error('Error creating customer:', error);
    return c.json({ error: 'Failed to create customer' }, 500);
  }
});

// Update customer
router.put('/:id', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const body = await c.req.json();
    const { name, vat, address, city, country, phone, email, website } = body;
    const customerId = c.req.param('id');

    // Validate required fields
    if (!name) {
      return c.json({ error: 'Name is required' }, 400);
    }

    // Check if customer exists
    const existingCustomer = await database.getRow('SELECT id FROM customer WHERE id = ?', [customerId]);
    if (!existingCustomer) {
      return c.json({ error: 'Customer not found' }, 404);
    }

    // Check if VAT already exists for another customer (if provided)
    if (vat) {
      const duplicateVat = await database.getRow('SELECT id FROM customer WHERE vat = ? AND id != ?', [vat, customerId]);
      if (duplicateVat) {
        return c.json({ error: 'Customer with this VAT already exists' }, 400);
      }
    }

    await database.runQuery(
      'UPDATE customer SET name = ?, vat = ?, address = ?, city = ?, country = ?, phone = ?, email = ?, website = ? WHERE id = ?',
      [name, vat || null, address || null, city || null, country || null, phone || null, email || null, website || null, customerId]
    );

    const updatedCustomer = await database.getRow('SELECT * FROM customer WHERE id = ?', [customerId]);
    return c.json(updatedCustomer);
  } catch (error) {
    console.error('Error updating customer:', error);
    return c.json({ error: 'Failed to update customer' }, 500);
  }
});

// Delete customer
router.delete('/:id', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const customerId = c.req.param('id');

    // Check if customer exists
    const existingCustomer = await database.getRow('SELECT id FROM customer WHERE id = ?', [customerId]);
    if (!existingCustomer) {
      return c.json({ error: 'Customer not found' }, 404);
    }

    // Check if customer is referenced in sales
    const referencedInSales = await database.getRow('SELECT id FROM sell WHERE fk_customer = ? LIMIT 1', [customerId]);
    if (referencedInSales) {
      return c.json({ error: 'Cannot delete customer: referenced in sales' }, 400);
    }

    await database.runQuery('DELETE FROM customer WHERE id = ?', [customerId]);
    return c.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return c.json({ error: 'Failed to delete customer' }, 500);
  }
});

// Get customer statistics for dashboard
router.get('/stats/summary', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    // Get total customers count
    const totalCustomersResult = await database.getRow('SELECT COUNT(*) as count FROM customer');
    const totalCustomers = totalCustomersResult.count || 0;
    
    // Get customers with sales count
    const customersWithSalesResult = await database.getRow('SELECT COUNT(DISTINCT fk_customer) as count FROM sell WHERE fk_customer IS NOT NULL');
    const customersWithSales = customersWithSalesResult.count || 0;
    
    return c.json({
      totalCustomers,
      customersWithSales,
      customersWithoutSales: totalCustomers - customersWithSales
    });
  } catch (error) {
    console.error('Error fetching customer stats:', error);
    return c.json({ error: 'Failed to fetch customer statistics' }, 500);
  }
});

export default router; 