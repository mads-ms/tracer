const express = require('express');
const router = express.Router();
const { runQuery, getRow, getAll } = require('../database/database');

// Get company information
router.get('/', async (req, res) => {
  try {
    const company = await getRow('SELECT * FROM company LIMIT 1');
    const settings = await getRow('SELECT * FROM settings WHERE id = 1');
    
    res.json({
      company: company || {},
      settings: settings || {}
    });
  } catch (error) {
    console.error('Error fetching company information:', error);
    res.status(500).json({ error: 'Failed to fetch company information' });
  }
});

// Get company details only
router.get('/details', async (req, res) => {
  try {
    const company = await getRow('SELECT * FROM company LIMIT 1');
    
    if (!company) {
      return res.status(404).json({ error: 'Company information not found' });
    }
    
    res.json(company);
  } catch (error) {
    console.error('Error fetching company details:', error);
    res.status(500).json({ error: 'Failed to fetch company details' });
  }
});

// Get system settings only
router.get('/settings', async (req, res) => {
  try {
    const settings = await getRow('SELECT * FROM settings WHERE id = 1');
    
    if (!settings) {
      return res.status(404).json({ error: 'System settings not found' });
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({ error: 'Failed to fetch system settings' });
  }
});

// Create or update company information
router.post('/details', async (req, res) => {
  try {
    const {
      vat,
      gs1_code,
      name,
      address,
      cap,
      city,
      phone,
      email
    } = req.body;
    
    // Validation
    if (!vat || !gs1_code || !name || !address || !cap || !city || !phone || !email) {
      return res.status(400).json({ 
        error: 'All fields are required: vat, gs1_code, name, address, cap, city, phone, email' 
      });
    }
    
    // Check if company already exists
    const existingCompany = await getRow('SELECT id FROM company LIMIT 1');
    
    if (existingCompany) {
      // Update existing company
      await runQuery(
        `UPDATE company SET 
          vat = ?, gs1_code = ?, name = ?, address = ?, 
          cap = ?, city = ?, phone = ?, email = ?
         WHERE id = ?`,
        [vat, gs1_code, name, address, cap, city, phone, email, existingCompany.id]
      );
    } else {
      // Create new company
      await runQuery(
        `INSERT INTO company (
          vat, gs1_code, name, address, cap, city, phone, email
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [vat, gs1_code, name, address, cap, city, phone, email]
      );
    }
    
    const updatedCompany = await getRow('SELECT * FROM company LIMIT 1');
    
    res.json(updatedCompany);
  } catch (error) {
    console.error('Error updating company information:', error);
    res.status(500).json({ error: 'Failed to update company information' });
  }
});

// Update system settings
router.post('/settings', async (req, res) => {
  try {
    const {
      db_version,
      date_format,
      language,
      backup_last,
      backup_path,
      server_id,
      os_name,
      os_version
    } = req.body;
    
    // Validation
    if (!db_version || !date_format || !language) {
      return res.status(400).json({ 
        error: 'Required fields: db_version, date_format, language' 
      });
    }
    
    // Check if settings already exist
    const existingSettings = await getRow('SELECT id FROM settings WHERE id = 1');
    
    if (existingSettings) {
      // Update existing settings
      await runQuery(
        `UPDATE settings SET 
          db_version = ?, date_format = ?, language = ?, backup_last = ?,
          backup_path = ?, server_id = ?, os_name = ?, os_version = ?
         WHERE id = 1`,
        [db_version, date_format, language, backup_last || null, 
         backup_path || null, server_id || null, os_name || null, os_version || null]
      );
    } else {
      // Create new settings
      await runQuery(
        `INSERT INTO settings (
          id, db_version, date_format, language, backup_last,
          backup_path, server_id, os_name, os_version
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [db_version, date_format, language, backup_last || null, 
         backup_path || null, server_id || null, os_name || null, os_version || null]
      );
    }
    
    const updatedSettings = await getRow('SELECT * FROM settings WHERE id = 1');
    
    res.json(updatedSettings);
  } catch (error) {
    console.error('Error updating system settings:', error);
    res.status(500).json({ error: 'Failed to update system settings' });
  }
});

// Get system statistics
router.get('/stats', async (req, res) => {
  try {
    const [
      suppliersCount,
      customersCount,
      lotsInCount,
      lotsOutCount,
      checksCount,
      salesCount,
      rawFoodsCount,
      processedFoodsCount
    ] = await Promise.all([
      getRow('SELECT COUNT(*) as count FROM supplier'),
      getRow('SELECT COUNT(*) as count FROM customer'),
      getRow('SELECT COUNT(*) as count FROM lot_in'),
      getRow('SELECT COUNT(*) as count FROM lot_out'),
      getRow('SELECT COUNT(*) as count FROM supply_check'),
      getRow('SELECT COUNT(*) as count FROM sell'),
      getRow('SELECT COUNT(*) as count FROM food_in'),
      getRow('SELECT COUNT(*) as count FROM food_out')
    ]);
    
    res.json({
      suppliers: suppliersCount.count,
      customers: customersCount.count,
      lotsIn: lotsInCount.count,
      lotsOut: lotsOutCount.count,
      checks: checksCount.count,
      sales: salesCount.count,
      rawFoods: rawFoodsCount.count,
      processedFoods: processedFoodsCount.count
    });
  } catch (error) {
    console.error('Error fetching system statistics:', error);
    res.status(500).json({ error: 'Failed to fetch system statistics' });
  }
});

// Get database backup information
router.get('/backup', async (req, res) => {
  try {
    const settings = await getRow('SELECT backup_last, backup_path FROM settings WHERE id = 1');
    
    res.json({
      lastBackup: settings?.backup_last || null,
      backupPath: settings?.backup_path || null,
      databaseSize: 'N/A', // Would need file system access to calculate
      lastBackupSize: 'N/A'
    });
  } catch (error) {
    console.error('Error fetching backup information:', error);
    res.status(500).json({ error: 'Failed to fetch backup information' });
  }
});

// Update backup information
router.post('/backup', async (req, res) => {
  try {
    const { backup_last, backup_path } = req.body;
    
    if (!backup_last || !backup_path) {
      return res.status(400).json({ 
        error: 'Required fields: backup_last, backup_path' 
      });
    }
    
    await runQuery(
      'UPDATE settings SET backup_last = ?, backup_path = ? WHERE id = 1',
      [backup_last, backup_path]
    );
    
    res.json({ message: 'Backup information updated successfully' });
  } catch (error) {
    console.error('Error updating backup information:', error);
    res.status(500).json({ error: 'Failed to update backup information' });
  }
});

// Get system information
router.get('/system', async (req, res) => {
  try {
    const settings = await getRow('SELECT server_id, os_name, os_version FROM settings WHERE id = 1');
    
    res.json({
      serverId: settings?.server_id || 'Unknown',
      osName: settings?.os_name || 'Unknown',
      osVersion: settings?.os_version || 'Unknown',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      startTime: new Date(Date.now() - process.uptime() * 1000).toISOString()
    });
  } catch (error) {
    console.error('Error fetching system information:', error);
    res.status(500).json({ error: 'Failed to fetch system information' });
  }
});

// Update system information
router.post('/system', async (req, res) => {
  try {
    const { server_id, os_name, os_version } = req.body;
    
    if (!server_id || !os_name || !os_version) {
      return res.status(400).json({ 
        error: 'Required fields: server_id, os_name, os_version' 
      });
    }
    
    await runQuery(
      'UPDATE settings SET server_id = ?, os_name = ?, os_version = ? WHERE id = 1',
      [server_id, os_name, os_version]
    );
    
    res.json({ message: 'System information updated successfully' });
  } catch (error) {
    console.error('Error updating system information:', error);
    res.status(500).json({ error: 'Failed to update system information' });
  }
});

module.exports = router; 