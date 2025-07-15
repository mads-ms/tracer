const express = require('express');
const router = express.Router();
const { runQuery, getRow, getAll } = require('../database/database');

// Get complete traceability chain for a lot
router.get('/lot/:lotId', async (req, res) => {
  try {
    const lotId = req.params.lotId;
    const lotType = req.query.type; // 'in' or 'out'
    
    if (!lotType || !['in', 'out'].includes(lotType)) {
      return res.status(400).json({ error: 'Lot type must be specified: "in" or "out"' });
    }
    
    let traceabilityData = {};
    
    if (lotType === 'in') {
      // Trace incoming lot forward
      const incomingLot = await getRow(`
        SELECT 
          li.*,
          fi.name as food_name,
          fi.unit_measure,
          fi.source,
          s.name as supplier_name,
          s.vat as supplier_vat,
          s.address as supplier_address,
          s.city as supplier_city
        FROM lot_in li
        LEFT JOIN food_in fi ON li.fk_food_in = fi.id
        LEFT JOIN supplier s ON li.fk_supplier = s.id
        WHERE li.id = ?
      `, [lotId]);
      
      if (!incomingLot) {
        return res.status(404).json({ error: 'Incoming lot not found' });
      }
      
      // Find all outgoing lots that used this incoming lot
      const outgoingLots = await getAll(`
        SELECT 
          lo.*,
          fo.name as food_name,
          fo.unit_measure,
          g.code as gtin_code
        FROM lot_out lo
        LEFT JOIN food_out fo ON lo.fk_food_out = fo.id
        LEFT JOIN gtin_13 g ON fo.fk_gtin = g.id
        WHERE lo.fk_lot_in = ?
        ORDER BY lo.creation_date ASC
      `, [lotId]);
      
      // Find all sales of these outgoing lots
      const sales = await getAll(`
        SELECT 
          s.*,
          c.name as customer_name,
          c.vat as customer_vat,
          c.city as customer_city
        FROM sell s
        WHERE s.fk_lot_out IN (
          SELECT id FROM lot_out WHERE fk_lot_in = ?
        )
        ORDER BY s.invoice_date ASC
      `, [lotId]);
      
      traceabilityData = {
        incomingLot,
        outgoingLots,
        sales,
        summary: {
          totalOutgoingLots: outgoingLots.length,
          totalSales: sales.length,
          totalQuantityProcessed: outgoingLots.reduce((sum, lot) => sum + (lot.quantity_of_food || 0), 0),
          quantityRemaining: incomingLot.quantity_remaining
        }
      };
    } else {
      // Trace outgoing lot backward
      const outgoingLot = await getRow(`
        SELECT 
          lo.*,
          fo.name as food_name,
          fo.unit_measure,
          g.code as gtin_code,
          g.progressive
        FROM lot_out lo
        LEFT JOIN food_out fo ON lo.fk_food_out = fo.id
        LEFT JOIN gtin_13 g ON fo.fk_gtin = g.id
        WHERE lo.id = ?
      `, [lotId]);
      
      if (!outgoingLot) {
        return res.status(404).json({ error: 'Outgoing lot not found' });
      }
      
      // Find source incoming lot
      let sourceIncomingLot = null;
      if (outgoingLot.fk_lot_in) {
        sourceIncomingLot = await getRow(`
          SELECT 
            li.*,
            fi.name as food_name,
            fi.unit_measure,
            fi.source,
            s.name as supplier_name,
            s.vat as supplier_vat,
            s.address as supplier_address,
            s.city as supplier_city
          FROM lot_in li
          LEFT JOIN food_in fi ON li.fk_food_in = fi.id
          LEFT JOIN supplier s ON li.fk_supplier = s.id
          WHERE li.id = ?
        `, [outgoingLot.fk_lot_in]);
      }
      
      // Find all sales of this outgoing lot
      const sales = await getAll(`
        SELECT 
          s.*,
          c.name as customer_name,
          c.vat as customer_vat,
          c.city as customer_city
        FROM sell s
        LEFT JOIN customer c ON s.fk_customer = c.id
        WHERE s.fk_lot_out = ?
        ORDER BY s.invoice_date ASC
      `, [lotId]);
      
      traceabilityData = {
        outgoingLot,
        sourceIncomingLot,
        sales,
        summary: {
          totalSales: sales.length,
          quantitySold: sales.length, // Each sale represents one unit
          quantityRemaining: outgoingLot.quantity_of_food - sales.length
        }
      };
    }
    
    res.json(traceabilityData);
  } catch (error) {
    console.error('Error fetching lot traceability:', error);
    res.status(500).json({ error: 'Failed to fetch lot traceability' });
  }
});

// Get traceability by GTIN
router.get('/gtin/:gtinCode', async (req, res) => {
  try {
    const gtinCode = req.params.gtinCode;
    
    // Find all foods with this GTIN
    const foods = await getAll(`
      SELECT 
        fo.*,
        g.code as gtin_code,
        g.progressive
      FROM food_out fo
      LEFT JOIN gtin_13 g ON fo.fk_gtin = g.id
      WHERE g.code = ?
      ORDER BY fo.name ASC
    `, [gtinCode]);
    
    if (foods.length === 0) {
      return res.status(404).json({ error: 'No foods found with this GTIN' });
    }
    
    // Get all lots for these foods
    const lots = await getAll(`
      SELECT 
        lo.*,
        fo.name as food_name,
        fo.unit_measure,
        g.code as gtin_code
      FROM lot_out lo
      LEFT JOIN food_out fo ON lo.fk_food_out = fo.id
      LEFT JOIN gtin_13 g ON fo.fk_gtin = g.id
      WHERE g.code = ?
      ORDER BY lo.creation_date DESC
    `, [gtinCode]);
    
    // Get all sales for these lots
    const sales = await getAll(`
      SELECT 
        s.*,
        c.name as customer_name,
        c.vat as customer_vat,
        c.city as customer_city,
        lo.lot_number as lot_number,
        fo.name as food_name
      FROM sell s
      LEFT JOIN customer c ON s.fk_customer = c.id
      LEFT JOIN lot_out lo ON s.fk_lot_out = lo.id
      LEFT JOIN food_out fo ON lo.fk_food_out = fo.id
      LEFT JOIN gtin_13 g ON fo.fk_gtin = g.id
      WHERE g.code = ?
      ORDER BY s.invoice_date DESC
    `, [gtinCode]);
    
    res.json({
      gtinCode,
      foods,
      lots,
      sales,
      summary: {
        totalFoods: foods.length,
        totalLots: lots.length,
        totalSales: sales.length,
        totalQuantity: lots.reduce((sum, lot) => sum + (lot.quantity_of_food || 0), 0)
      }
    });
  } catch (error) {
    console.error('Error fetching GTIN traceability:', error);
    res.status(500).json({ error: 'Failed to fetch GTIN traceability' });
  }
});

// Get traceability by customer
router.get('/customer/:customerId', async (req, res) => {
  try {
    const customerId = req.params.customerId;
    
    // Check if customer exists
    const customer = await getRow(
      'SELECT * FROM customer WHERE id = ?',
      [customerId]
    );
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Get all sales to this customer
    const sales = await getAll(`
      SELECT 
        s.*,
        lo.lot_number as lot_out_number,
        lo.creation_date as lot_out_creation_date,
        lo.expiry_date as lot_out_expiry_date,
        fo.name as lot_out_food_name,
        fo.unit_measure as lot_out_unit_measure,
        g_out.code as lot_out_gtin_code,
        li.lot_number as lot_in_number,
        li.acceptance_date as lot_in_acceptance_date,
        fi.name as lot_in_food_name,
        fi.source as lot_in_source,
        s_in.name as lot_in_supplier_name,
        p.type as package_type,
        p.description as package_description,
        p.measure as package_measure,
        g_pkg.code as package_gtin_code
      FROM sell s
      LEFT JOIN lot_out lo ON s.fk_lot_out = lo.id
      LEFT JOIN food_out fo ON lo.fk_food_out = fo.id
      LEFT JOIN gtin_13 g_out ON fo.fk_gtin = g_out.id
      LEFT JOIN lot_in li ON s.fk_lot_in = li.id
      LEFT JOIN food_in fi ON li.fk_food_in = fi.id
      LEFT JOIN supplier s_in ON li.fk_supplier = s_in.id
      LEFT JOIN package p ON s.fk_package = p.id
      LEFT JOIN gtin_13 g_pkg ON p.fk_gtin = g_pkg.id
      WHERE s.fk_customer = ?
      ORDER BY s.invoice_date DESC
    `, [customerId]);
    
    // Get unique products sold to this customer
    const uniqueProducts = await getAll(`
      SELECT DISTINCT
        CASE 
          WHEN s.fk_lot_out IS NOT NULL THEN 'Processed Food'
          WHEN s.fk_lot_in IS NOT NULL THEN 'Raw Material'
          WHEN s.fk_package IS NOT NULL THEN 'Package'
          ELSE 'Unknown'
        END as product_type,
        CASE 
          WHEN s.fk_lot_out IS NOT NULL THEN fo.name
          WHEN s.fk_lot_in IS NOT NULL THEN fi.name
          WHEN s.fk_package IS NOT NULL THEN p.description
          ELSE 'Unknown'
        END as product_name,
        CASE 
          WHEN s.fk_lot_out IS NOT NULL THEN g_out.code
          WHEN s.fk_lot_in IS NOT NULL THEN NULL
          WHEN s.fk_package IS NOT NULL THEN g_pkg.code
          ELSE NULL
        END as gtin_code
      FROM sell s
      LEFT JOIN lot_out lo ON s.fk_lot_out = lo.id
      LEFT JOIN food_out fo ON lo.fk_food_out = fo.id
      LEFT JOIN gtin_13 g_out ON fo.fk_gtin = g_out.id
      LEFT JOIN lot_in li ON s.fk_lot_in = li.id
      LEFT JOIN food_in fi ON li.fk_food_in = fi.id
      LEFT JOIN package p ON s.fk_package = p.id
      LEFT JOIN gtin_13 g_pkg ON p.fk_gtin = g_pkg.id
      WHERE s.fk_customer = ?
      ORDER BY product_type, product_name
    `, [customerId]);
    
    res.json({
      customer,
      sales,
      uniqueProducts,
      summary: {
        totalSales: sales.length,
        uniqueProductTypes: uniqueProducts.length,
        firstPurchase: sales.length > 0 ? sales[sales.length - 1].invoice_date : null,
        lastPurchase: sales.length > 0 ? sales[0].invoice_date : null
      }
    });
  } catch (error) {
    console.error('Error fetching customer traceability:', error);
    res.status(500).json({ error: 'Failed to fetch customer traceability' });
  }
});

// Get traceability by supplier
router.get('/supplier/:supplierId', async (req, res) => {
  try {
    const supplierId = req.params.supplierId;
    
    // Check if supplier exists
    const supplier = await getRow(
      'SELECT * FROM supplier WHERE id = ?',
      [supplierId]
    );
    
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    
    // Get all incoming lots from this supplier
    const incomingLots = await getAll(`
      SELECT 
        li.*,
        fi.name as food_name,
        fi.unit_measure,
        fi.source
      FROM lot_in li
      LEFT JOIN food_in fi ON li.fk_food_in = fi.id
      WHERE li.fk_supplier = ?
      ORDER BY li.acceptance_date DESC
    `, [supplierId]);
    
    // Get all outgoing lots that used materials from this supplier
    const outgoingLots = await getAll(`
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
      WHERE li.fk_supplier = ?
      ORDER BY lo.creation_date DESC
    `, [supplierId]);
    
    // Get all sales of products made from this supplier's materials
    const sales = await getAll(`
      SELECT 
        s.*,
        c.name as customer_name,
        c.vat as customer_vat,
        c.city as customer_city,
        lo.lot_number as lot_out_number,
        fo.name as lot_out_food_name,
        li.lot_number as source_lot_number,
        fi.name as source_food_name
      FROM sell s
      LEFT JOIN customer c ON s.fk_customer = c.id
      LEFT JOIN lot_out lo ON s.fk_lot_out = lo.id
      LEFT JOIN food_out fo ON lo.fk_food_out = fo.id
      LEFT JOIN lot_in li ON lo.fk_lot_in = li.id
      LEFT JOIN food_in fi ON li.fk_food_in = fi.id
      WHERE li.fk_supplier = ?
      ORDER BY s.invoice_date DESC
    `, [supplierId]);
    
    res.json({
      supplier,
      incomingLots,
      outgoingLots,
      sales,
      summary: {
        totalIncomingLots: incomingLots.length,
        totalOutgoingLots: outgoingLots.length,
        totalSales: sales.length,
        totalQuantityReceived: incomingLots.reduce((sum, lot) => sum + (lot.quantity || 0), 0),
        totalQuantityProcessed: outgoingLots.reduce((sum, lot) => sum + (lot.quantity_of_food || 0), 0)
      }
    });
  } catch (error) {
    console.error('Error fetching supplier traceability:', error);
    res.status(500).json({ error: 'Failed to fetch supplier traceability' });
  }
});

// Get traceability by date range
router.get('/date-range/:startDate/:endDate', async (req, res) => {
  try {
    const { startDate, endDate } = req.params;
    
    // Get all activities in date range
    const incomingLots = await getAll(`
      SELECT 
        li.*,
        fi.name as food_name,
        fi.unit_measure,
        fi.source,
        s.name as supplier_name
      FROM lot_in li
      LEFT JOIN food_in fi ON li.fk_food_in = fi.id
      LEFT JOIN supplier s ON li.fk_supplier = s.id
      WHERE li.acceptance_date BETWEEN ? AND ?
      ORDER BY li.acceptance_date DESC
    `, [startDate, endDate]);
    
    const outgoingLots = await getAll(`
      SELECT 
        lo.*,
        fo.name as food_name,
        fo.unit_measure,
        g.code as gtin_code
      FROM lot_out lo
      LEFT JOIN food_out fo ON lo.fk_food_out = fo.id
      LEFT JOIN gtin_13 g ON fo.fk_gtin = g.id
      WHERE lo.creation_date BETWEEN ? AND ?
      ORDER BY lo.creation_date DESC
    `, [startDate, endDate]);
    
    const sales = await getAll(`
      SELECT 
        s.*,
        c.name as customer_name,
        c.vat as customer_vat,
        c.city as customer_city
      FROM sell s
      LEFT JOIN customer c ON s.fk_customer = c.id
      WHERE s.invoice_date BETWEEN ? AND ?
      ORDER BY s.invoice_date DESC
    `, [startDate, endDate]);
    
    const qualityChecks = await getAll(`
      SELECT 
        qc.*,
        li.lot_number as lot_number,
        fi.name as food_name,
        s.name as supplier_name
      FROM quality_check qc
      LEFT JOIN lot_in li ON qc.fk_lot_in = li.id
      LEFT JOIN food_in fi ON li.fk_food_in = fi.id
      LEFT JOIN supplier s ON li.fk_supplier = s.id
      WHERE qc.check_date BETWEEN ? AND ?
      ORDER BY qc.check_date DESC
    `, [startDate, endDate]);
    
    res.json({
      dateRange: { startDate, endDate },
      incomingLots,
      outgoingLots,
      sales,
      qualityChecks,
      summary: {
        totalIncomingLots: incomingLots.length,
        totalOutgoingLots: outgoingLots.length,
        totalSales: sales.length,
        totalQualityChecks: qualityChecks.length,
        totalQuantityReceived: incomingLots.reduce((sum, lot) => sum + (lot.quantity || 0), 0),
        totalQuantityProcessed: outgoingLots.reduce((sum, lot) => sum + (lot.quantity_of_food || 0), 0)
      }
    });
  } catch (error) {
    console.error('Error fetching date range traceability:', error);
    res.status(500).json({ error: 'Failed to fetch date range traceability' });
  }
});

// Get traceability report
router.get('/report/summary', async (req, res) => {
  try {
    // Get overall statistics
    const totalIncomingLots = await getRow('SELECT COUNT(*) as count FROM lot_in');
    const totalOutgoingLots = await getRow('SELECT COUNT(*) as count FROM lot_out');
    const totalSales = await getRow('SELECT COUNT(*) as count FROM sell');
    const totalSuppliers = await getRow('SELECT COUNT(*) as count FROM supplier');
    const totalCustomers = await getRow('SELECT COUNT(*) as count FROM customer');
    const totalQualityChecks = await getRow('SELECT COUNT(*) as count FROM quality_check');
    
    // Get recent activities (last 30 days)
    const recentIncomingLots = await getRow(`
      SELECT COUNT(*) as count FROM lot_in 
      WHERE acceptance_date >= date('now', '-30 days')
    `);
    
    const recentOutgoingLots = await getRow(`
      SELECT COUNT(*) as count FROM lot_out 
      WHERE creation_date >= date('now', '-30 days')
    `);
    
    const recentSales = await getRow(`
      SELECT COUNT(*) as count FROM sell 
      WHERE invoice_date >= date('now', '-30 days')
    `);
    
    // Get top suppliers by quantity
    const topSuppliers = await getAll(`
      SELECT 
        s.name as supplier_name,
        s.vat as supplier_vat,
        COUNT(li.id) as lot_count,
        SUM(li.quantity) as total_quantity
      FROM supplier s
      LEFT JOIN lot_in li ON s.id = li.fk_supplier
      GROUP BY s.id, s.name, s.vat
      ORDER BY total_quantity DESC
      LIMIT 10
    `);
    
    // Get top customers by sales
    const topCustomers = await getAll(`
      SELECT 
        c.name as customer_name,
        c.vat as customer_vat,
        COUNT(s.id) as sale_count
      FROM customer c
      LEFT JOIN sell s ON c.id = s.fk_customer
      GROUP BY c.id, c.name, c.vat
      ORDER BY sale_count DESC
      LIMIT 10
    `);
    
    // Get quality check statistics
    const qualityStats = await getAll(`
      SELECT 
        result,
        COUNT(*) as count
      FROM quality_check
      GROUP BY result
      ORDER BY count DESC
    `);
    
    res.json({
      overall: {
        totalIncomingLots: totalIncomingLots.count,
        totalOutgoingLots: totalOutgoingLots.count,
        totalSales: totalSales.count,
        totalSuppliers: totalSuppliers.count,
        totalCustomers: totalCustomers.count,
        totalQualityChecks: totalQualityChecks.count
      },
      recent: {
        incomingLots: recentIncomingLots.count,
        outgoingLots: recentOutgoingLots.count,
        sales: recentSales.count
      },
      topSuppliers,
      topCustomers,
      qualityStats
    });
  } catch (error) {
    console.error('Error generating traceability report:', error);
    res.status(500).json({ error: 'Failed to generate traceability report' });
  }
});

// Export traceability data
router.get('/export/:format', async (req, res) => {
  try {
    const format = req.params.format;
    
    if (!['json', 'csv'].includes(format)) {
      return res.status(400).json({ error: 'Export format must be "json" or "csv"' });
    }
    
    // Get all traceability data
    const incomingLots = await getAll(`
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
      ORDER BY li.acceptance_date DESC
    `);
    
    const outgoingLots = await getAll(`
      SELECT 
        lo.*,
        fo.name as food_name,
        fo.unit_measure,
        g.code as gtin_code,
        li.lot_number as source_lot_number,
        fi.name as source_food_name
      FROM lot_out lo
      LEFT JOIN food_out fo ON lo.fk_food_out = fo.id
      LEFT JOIN gtin_13 g ON fo.fk_gtin = g.id
      LEFT JOIN lot_in li ON lo.fk_lot_in = li.id
      LEFT JOIN food_in fi ON li.fk_food_in = fi.id
      ORDER BY lo.creation_date DESC
    `);
    
    const sales = await getAll(`
      SELECT 
        s.*,
        c.name as customer_name,
        c.vat as customer_vat,
        c.city as customer_city,
        lo.lot_number as lot_out_number,
        fo.name as lot_out_food_name,
        li.lot_number as lot_in_number,
        fi.name as lot_in_food_name,
        p.type as package_type,
        p.description as package_description
      FROM sell s
      LEFT JOIN customer c ON s.fk_customer = c.id
      LEFT JOIN lot_out lo ON s.fk_lot_out = lo.id
      LEFT JOIN food_out fo ON lo.fk_food_out = fo.id
      LEFT JOIN lot_in li ON s.fk_lot_in = li.id
      LEFT JOIN food_in fi ON li.fk_food_in = fi.id
      LEFT JOIN package p ON s.fk_package = p.id
      ORDER BY s.invoice_date DESC
    `);
    
    const exportData = {
      exportDate: new Date().toISOString(),
      incomingLots,
      outgoingLots,
      sales
    };
    
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="traceability-export.json"');
      res.json(exportData);
    } else if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertToCSV(exportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="traceability-export.csv"');
      res.send(csvData);
    }
  } catch (error) {
    console.error('Error exporting traceability data:', error);
    res.status(500).json({ error: 'Failed to export traceability data' });
  }
});

// Helper function to convert data to CSV
function convertToCSV(data) {
  const csvRows = [];
  
  // Add headers
  csvRows.push('Export Date: ' + data.exportDate);
  csvRows.push('');
  
  // Incoming Lots
  csvRows.push('INCOMING LOTS');
  csvRows.push('ID,Lot Number,Acceptance Date,DDT Number,Quantity,Quantity Remaining,Food Name,Unit Measure,Source,Supplier Name,Supplier VAT');
  
  data.incomingLots.forEach(lot => {
    csvRows.push([
      lot.id,
      lot.lot_number,
      lot.acceptance_date,
      lot.ddt_number,
      lot.quantity,
      lot.quantity_remaining,
      lot.food_name,
      lot.unit_measure,
      lot.source,
      lot.supplier_name,
      lot.supplier_vat
    ].join(','));
  });
  
  csvRows.push('');
  
  // Outgoing Lots
  csvRows.push('OUTGOING LOTS');
  csvRows.push('ID,Lot Number,Creation Date,Expiry Date,Quantity,Food Name,Unit Measure,GTIN Code,Source Lot Number,Source Food Name');
  
  data.outgoingLots.forEach(lot => {
    csvRows.push([
      lot.id,
      lot.lot_number,
      lot.creation_date,
      lot.expiry_date,
      lot.quantity_of_food,
      lot.food_name,
      lot.unit_measure,
      lot.gtin_code,
      lot.source_lot_number,
      lot.source_food_name
    ].join(','));
  });
  
  csvRows.push('');
  
  // Sales
  csvRows.push('SALES');
  csvRows.push('ID,Invoice Number,Invoice Date,Customer Name,Customer VAT,Customer City,Lot Out Number,Lot Out Food Name,Lot In Number,Lot In Food Name,Package Type,Package Description');
  
  data.sales.forEach(sale => {
    csvRows.push([
      sale.id,
      sale.invoice_number,
      sale.invoice_date,
      sale.customer_name,
      sale.customer_vat,
      sale.customer_city,
      sale.lot_out_number,
      sale.lot_out_food_name,
      sale.lot_in_number,
      sale.lot_in_food_name,
      sale.package_type,
      sale.package_description
    ].join(','));
  });
  
  return csvRows.join('\n');
}

module.exports = router; 