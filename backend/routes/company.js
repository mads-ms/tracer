import { Hono } from 'hono';

const router = new Hono();

// Get company information
router.get('/', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const company = await database.getRow('SELECT * FROM company LIMIT 1');
    if (!company) {
      return c.json({ error: 'Company information not found' }, 404);
    }
    return c.json(company);
  } catch (error) {
    console.error('Error fetching company:', error);
    return c.json({ error: 'Failed to fetch company information' }, 500);
  }
});

// Update company information
router.put('/', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const body = await c.req.json();
    const { name, vat, address, city, country, phone, email, website, logo } = body;
    
    // Validate required fields
    if (!name) {
      return c.json({ error: 'Company name is required' }, 400);
    }

    // Check if company exists
    const existingCompany = await database.getRow('SELECT id FROM company LIMIT 1');
    
    if (existingCompany) {
      // Update existing company
      await database.runQuery(
        'UPDATE company SET name = ?, vat = ?, address = ?, city = ?, country = ?, phone = ?, email = ?, website = ?, logo = ? WHERE id = ?',
        [name, vat || null, address || null, city || null, country || null, phone || null, email || null, website || null, logo || null, existingCompany.id]
      );
    } else {
      // Create new company
      await database.runQuery(
        'INSERT INTO company (name, vat, address, city, country, phone, email, website, logo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [name, vat || null, address || null, city || null, country || null, phone || null, email || null, website || null, logo || null]
      );
    }

    const updatedCompany = await database.getRow('SELECT * FROM company LIMIT 1');
    return c.json(updatedCompany);
  } catch (error) {
    console.error('Error updating company:', error);
    return c.json({ error: 'Failed to update company information' }, 500);
  }
});

export default router; 