import { Hono } from 'hono';

const router = new Hono();

// Get traceability information for a customer
router.get('/customer/:customerId', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const customerId = c.req.param('customerId');
    
    // Get customer information
    const customer = await database.getRow(`
      SELECT * FROM customer WHERE id = ?
    `, [customerId]);
    
    if (!customer) {
      return c.json({ error: 'Customer not found' }, 404);
    }
    
    // Get all sales for this customer
    const sales = await database.getAll(`
      SELECT 
        s.*,
        li.lot_number as lot_in_number,
        lo.lot_number as lot_out_number,
        p.description as package_description
      FROM sell s
      LEFT JOIN lot_in li ON s.fk_lot_in = li.id
      LEFT JOIN lot_out lo ON s.fk_lot_out = lo.id
      LEFT JOIN package p ON s.fk_package = p.id
      WHERE s.fk_customer = ?
      ORDER BY s.invoice_date DESC
    `, [customerId]);
    
    // Get total sales statistics
    const salesStats = await database.getRow(`
      SELECT 
        COUNT(*) as total_sales,
        SUM(CASE WHEN s.fk_lot_in IS NOT NULL THEN 1 ELSE 0 END) as incoming_lots,
        SUM(CASE WHEN s.fk_lot_out IS NOT NULL THEN 1 ELSE 0 END) as outgoing_lots,
        SUM(CASE WHEN s.fk_package IS NOT NULL THEN 1 ELSE 0 END) as packaged_sales
      FROM sell s
      WHERE s.fk_customer = ?
    `, [customerId]);
    
    // Get recent activity (last 10 sales)
    const recentActivity = sales.slice(0, 10);
    
    return c.json({
      customer,
      summary: {
        totalSales: salesStats.total_sales || 0,
        uniqueProductTypes: salesStats.total_sales || 0, // Placeholder for now
        firstPurchase: sales.length > 0 ? sales[sales.length - 1]?.invoice_date : null,
        lastPurchase: sales.length > 0 ? sales[0]?.invoice_date : null
      },
      uniqueProducts: sales.map(sale => ({
        product_type: sale.fk_lot_out ? 'Processed Food' : sale.fk_lot_in ? 'Raw Material' : 'Package',
        product_name: sale.lot_out_number || sale.lot_in_number || sale.package_description || 'Unknown',
        gtin_code: null // Placeholder for GTIN codes
      })),
      sales: sales.map(sale => ({
        id: sale.id,
        invoice_number: sale.invoice_number,
        invoice_date: sale.invoice_date,
        lot_out_food_name: sale.lot_out_number,
        lot_in_food_name: sale.lot_in_number,
        package_description: sale.package_description,
        fk_lot_out: sale.fk_lot_out,
        fk_lot_in: sale.fk_lot_in,
        fk_package: sale.fk_package,
        quantity: null, // Placeholder for quantity
        lot_out_gtin_code: null, // Placeholder for GTIN codes
        package_gtin_code: null // Placeholder for GTIN codes
      }))
    });
  } catch (error) {
    console.error('Error fetching customer traceability:', error);
    return c.json({ error: 'Failed to fetch customer traceability information' }, 500);
  }
});

// Get traceability information for a lot
router.get('/lot/:lotId', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const lotId = c.req.param('lotId');
    
    // Get lot information
    const lot = await database.getRow(`
      SELECT 
        li.*,
        fi.name as food_name,
        fi.unit_measure,
        fi.source,
        s.name as supplier_name,
        s.vat as supplier_vat
      FROM lot_in li
      LEFT JOIN food_in fi ON li.fk_food_in = fi.id
      LEFT JOIN supplier s ON li.fk_supplier = s.id
      WHERE li.id = ?
    `, [lotId]);
    
    if (!lot) {
      return c.json({ error: 'Lot not found' }, 404);
    }
    
    // Get quality checks
    const checks = await database.getAll(`
      SELECT * FROM supply_check WHERE fk_lot_in = ?
    `, [lotId]);
    
    // Get outgoing lots that use this lot
    const outgoingLots = await database.getAll(`
      SELECT 
        lo.*,
        fo.name as food_name
      FROM lot_out lo
      LEFT JOIN food_out fo ON lo.fk_food_out = fo.id
      WHERE lo.fk_lot_in = ?
    `, [lotId]);
    
    // Get sales that use this lot
    const sales = await database.getAll(`
      SELECT 
        s.*,
        c.name as customer_name
      FROM sell s
      LEFT JOIN customer c ON s.fk_customer = c.id
      WHERE s.fk_lot_in = ?
    `, [lotId]);
    
    return c.json({
      lot,
      checks,
      outgoingLots,
      sales,
      traceability: {
        supplier: lot.supplier_name,
        food: lot.food_name,
        lotNumber: lot.lot_number,
        acceptanceDate: lot.acceptance_date,
        expiryDate: lot.expiry_date,
        quantity: lot.quantity,
        remainingQuantity: lot.quantity_remaining
      }
    });
  } catch (error) {
    console.error('Error fetching traceability:', error);
    return c.json({ error: 'Failed to fetch traceability information' }, 500);
  }
});

// Get full traceability chain
router.get('/chain/:lotId', async (c) => {
  try {
    const database = c.get('database');
    if (!database) {
      return c.json({ error: 'Database not available' }, 500);
    }
    
    const lotId = c.req.param('lotId');
    
    // Get the complete chain
    const chain = await database.getAll(`
      WITH RECURSIVE trace_chain AS (
        -- Base case: start with the input lot
        SELECT 
          li.id,
          li.lot_number,
          li.acceptance_date,
          li.expiry_date,
          li.quantity,
          li.quantity_remaining,
          fi.name as food_name,
          s.name as supplier_name,
          0 as level,
          CAST(li.lot_number AS TEXT) as path
        FROM lot_in li
        LEFT JOIN food_in fi ON li.fk_food_in = fi.id
        LEFT JOIN supplier s ON li.fk_supplier = s.id
        WHERE li.id = ?
        
        UNION ALL
        
        -- Recursive case: find lots that use this lot
        SELECT 
          lo.id,
          lo.lot_number,
          lo.creation_date,
          lo.expiry_date,
          lo.quantity_of_food,
          NULL as quantity_remaining,
          fo.name as food_name,
          NULL as supplier_name,
          tc.level + 1,
          tc.path || ' -> ' || lo.lot_number
        FROM lot_out lo
        LEFT JOIN food_out fo ON lo.fk_food_out = fo.id
        JOIN trace_chain tc ON lo.fk_lot_in = tc.id
      )
      SELECT * FROM trace_chain
      ORDER BY level, lot_number
    `, [lotId]);
    
    return c.json({ chain });
  } catch (error) {
    console.error('Error fetching traceability chain:', error);
    return c.json({ error: 'Failed to fetch traceability chain' }, 500);
  }
});

export default router; 