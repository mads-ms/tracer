import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import D1Database from './database/d1.js';

// Import route handlers
import suppliersRoutes from './routes/suppliers.js';
import customersRoutes from './routes/customers.js';
import lotsInRoutes from './routes/lots-in.js';
import checksRoutes from './routes/checks.js';
import foodsRoutes from './routes/foods.js';
import companyRoutes from './routes/company.js';
import lotsOutRoutes from './routes/lots-out.js';
import packagesRoutes from './routes/packages.js';
import salesRoutes from './routes/sales.js';
import traceabilityRoutes from './routes/traceability.js';
import barcodesRoutes from './routes/barcodes.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', secureHeaders());
app.use('*', cors({
  origin: [
    'http://localhost:3000', 
    'https://haccp-trace-frontend.pages.dev',
    'https://sabor.farm'
  ],
  credentials: true
}));

// Simple rate limiting middleware
app.use('*', async (c, next) => {
  // Basic rate limiting - you can enhance this later
  const clientIP = c.req.header('cf-connecting-ip') || 'unknown';
  const key = `rate_limit:${clientIP}`;
  
  // For now, just pass through - you can implement proper rate limiting later
  await next();
});

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || 'development'
  });
});

// Database initialization middleware
app.use('*', async (c, next) => {
  if (c.env.DB) {
    try {
      const d1Db = new D1Database(c.env.DB);
      c.set('database', d1Db);
      
      // Note: In Cloudflare Workers, we can't maintain state between requests
      // So we need to check if tables exist on each request, but we can optimize this
      // by only running initialization if we get a database error
      await next();
    } catch (error) {
      console.error('Database middleware error:', error);
      return c.json({ error: 'Database middleware failed' }, 500);
    }
  } else {
    await next();
  }
});

// API routes
app.route('/api/suppliers', suppliersRoutes);
app.route('/api/customers', customersRoutes);
app.route('/api/lots-in', lotsInRoutes);
app.route('/api/checks', checksRoutes);
app.route('/api/foods', foodsRoutes);
app.route('/api/company', companyRoutes);
app.route('/api/lots-out', lotsOutRoutes);
app.route('/api/packages', packagesRoutes);
app.route('/api/sales', salesRoutes);
app.route('/api/traceability', traceabilityRoutes);
app.route('/api/barcodes', barcodesRoutes);

// Error handling
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ 
    error: 'Internal server error',
    message: c.env.ENVIRONMENT === 'development' ? err.message : 'Something went wrong'
  }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Endpoint not found' }, 404);
});

export default app;
