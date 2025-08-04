const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');

// Database configuration
const { getDatabase } = require('./database/adapter');

// Import routes
const suppliersRoutes = require('./routes/suppliers');
const customersRoutes = require('./routes/customers');
const lotsInRoutes = require('./routes/lots-in');
const checksRoutes = require('./routes/checks');
const foodsRoutes = require('./routes/foods');
const companyRoutes = require('./routes/company');
const lotsOutRoutes = require('./routes/lots-out');
const packagesRoutes = require('./routes/packages');
const salesRoutes = require('./routes/sales');
const traceabilityRoutes = require('./routes/traceability');
const barcodesRoutes = require('./routes/barcodes');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.CORS_ORIGIN || 'https://haccp-trace-frontend.onrender.com'] 
    : ['http://localhost:3000'],
  credentials: true
}));

// Body parsing middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/lots-in', lotsInRoutes);
app.use('/api/checks', checksRoutes);
app.use('/api/foods', foodsRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/lots-out', lotsOutRoutes);
app.use('/api/packages', packagesRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/traceability', traceabilityRoutes);
app.use('/api/barcodes', barcodesRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Initialize database and start server
const startServer = async () => {
  try {
    // Get database instance
    const database = getDatabase();
    
    // Initialize database tables
    await database.initialize();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`HACCP Trace Backend Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API Base URL: http://localhost:${PORT}/api`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`Database: ${database.type}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app; 