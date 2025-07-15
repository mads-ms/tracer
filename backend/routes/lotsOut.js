const express = require('express');
const router = express.Router();

// TODO: Implement outgoing lots management
router.get('/', (req, res) => {
  res.json({ message: 'Outgoing lots route - to be implemented' });
});

module.exports = router; 