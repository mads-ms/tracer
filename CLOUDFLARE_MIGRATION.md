# HACCP Traceability System - Cloudflare Migration Guide

## Overview
This guide covers the migration of the HACCP Traceability System from Render (PostgreSQL) to Cloudflare (D1 + Workers + Pages).

## Production URLs
- **Frontend**: https://sabor.farm
- **Backend API**: https://api.sabor.farm
- **Database**: Cloudflare D1 (via Workers)

## Development URLs
- **Frontend**: https://haccp-trace-frontend-dev.pages.dev
- **Backend API**: https://haccp-trace-backend-dev.m-d65.workers.dev

## Prerequisites
- Cloudflare account with Workers and Pages enabled
- D1 database created
- Custom domain configured (sabor.farm)

## Installation & Setup

### 1. Install Wrangler CLI
```bash
npm install -g wrangler
wrangler login
```

### 2. Configure D1 Database
```bash
cd backend
wrangler d1 create haccp-trace-db
wrangler d1 create haccp-trace-db-dev
```

### 3. Update Database IDs
Update `backend/wrangler.toml` with your actual database IDs.

## Deployment

### Quick Deploy
```bash
./deploy-cloudflare.sh
```

### Manual Deploy

#### Backend (Workers)
```bash
cd backend
npm run build
npm run deploy:prod
```

#### Frontend (Pages)
```bash
cd frontend
npm run build
npx wrangler pages deploy build --project-name haccp-trace-frontend --env production
```

## Environment Variables

### Backend (Workers)
- `D1`: D1 database binding (auto-configured)
- `NODE_ENV`: Set to 'production' in Workers

### Frontend (Pages)
- `REACT_APP_API_URL`: https://api.sabor.farm (auto-configured)

## Custom Domain Configuration

### Backend Worker
- **Production**: `api.sabor.farm/*`
- **Zone**: `sabor.farm`

### Frontend Pages
- **Production**: `sabor.farm/*`
- **Zone**: `sabor.farm`

## Database Schema
The system includes 18 tables for complete HACCP traceability:
- Company, Settings, Suppliers, Customers
- Foods (in/out), Lots (in/out), Packages
- Sales, Checks, Barcodes, Traceability
- GTIN codes and Check categories

## API Endpoints
All endpoints are available at `https://api.sabor.farm/api/`:
- `/suppliers` - Supplier management
- `/customers` - Customer management
- `/foods` - Food item management
- `/lots-in` - Incoming lot tracking
- `/lots-out` - Outgoing lot tracking
- `/packages` - Package management
- `/sales` - Sales tracking
- `/checks` - Quality checks
- `/barcodes` - Barcode management
- `/traceability` - Full traceability chain
- `/company` - Company settings
- `/health` - Health check

## Development Workflow

### Local Development
1. Start local backend: `cd backend && npm start`
2. Start local frontend: `cd frontend && npm start`
3. Frontend will connect to `http://localhost:3001`

### Production Deployment
1. Push changes to main branch
2. Run `./deploy-cloudflare.sh`
3. Changes deploy to custom domains

## Monitoring & Debugging

### Cloudflare Dashboard
- **Workers**: Monitor API performance and errors
- **Pages**: Monitor frontend deployment status
- **D1**: Monitor database queries and performance
- **Analytics**: Track usage and performance metrics

### Logs
- Worker logs available in Cloudflare dashboard
- D1 query logs available in Workers logs
- Frontend errors visible in browser console

## Performance Considerations
- **Edge Computing**: Workers run globally for low latency
- **D1 Database**: SQLite-based, optimized for read-heavy workloads
- **Caching**: Leverage Cloudflare's global CDN
- **Bundle Size**: Keep Worker bundle under 1MB for optimal performance

## Troubleshooting

### Common Issues
1. **Build Errors**: Check ES module compatibility
2. **Database Errors**: Verify D1 binding and permissions
3. **CORS Issues**: Check CORS configuration in Workers
4. **Import Errors**: Ensure all files use ES module syntax

### Debug Commands
```bash
# Check Worker status
cd backend && npx wrangler whoami

# Test D1 database
npx wrangler d1 execute haccp-trace-db --command "SELECT name FROM sqlite_master WHERE type='table';"

# Check Pages deployment
cd frontend && npx wrangler pages project list
```

## Rollback Plan
If issues arise:
1. **Database**: D1 supports point-in-time recovery
2. **Workers**: Previous versions available in dashboard
3. **Pages**: Automatic rollback on failed deployments
4. **DNS**: Revert custom domain configuration

## Support
For Cloudflare-specific issues:
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)

## Migration Checklist
- [x] D1 database created and configured
- [x] Backend migrated to Hono.js and ES modules
- [x] Frontend API configuration updated
- [x] Custom domains configured
- [x] All routes converted to ES modules
- [x] Deployment scripts updated
- [x] Documentation updated
- [x] Production deployment tested
