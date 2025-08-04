# HACCP Traceability System - Render.com Deployment Guide

This guide will help you deploy your HACCP traceability web application on Render.com.

## Prerequisites

- A GitHub repository containing your HACCP traceability application
- A Render.com account
- Node.js 16+ and npm installed locally for testing

## Project Structure

Your project should have the following structure:
```
haccp-trace-web/
├── backend/                 # Node.js/Express API
│   ├── database/
│   │   ├── adapter.js      # Database adapter (SQLite/PostgreSQL)
│   │   └── postgres.js     # PostgreSQL configuration
│   ├── routes/             # API routes
│   ├── package.json
│   └── server.js
├── frontend/               # React application
│   ├── src/
│   ├── public/
│   └── package.json
├── render.yaml             # Main blueprint configuration
├── backend/render.yaml     # Backend-specific configuration
├── frontend/render.yaml    # Frontend-specific configuration
└── package.json
```

## Deployment Options

### Option 1: Blueprint Deployment (Recommended)

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Add Render.com deployment configuration"
   git push origin main
   ```

2. **Deploy using Blueprint**
   - Go to [Render.com](https://render.com)
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository
   - Select the repository containing your HACCP application
   - Render will automatically detect the `render.yaml` file
   - Click "Apply" to deploy

3. **What happens during deployment:**
   - Render creates a PostgreSQL database
   - Deploys the backend API service
   - Deploys the frontend static site
   - Configures environment variables automatically
   - Sets up CORS between services

### Option 2: Manual Deployment

If you prefer to deploy services individually:

#### Step 1: Create PostgreSQL Database
1. Go to Render Dashboard → "New +" → "PostgreSQL"
2. Choose "Free" plan
3. Name: `haccp-trace-db`
4. Database: `haccp_trace`
5. User: `haccp_user`
6. Note the connection string

#### Step 2: Deploy Backend API
1. Go to "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `haccp-trace-backend`
   - **Environment**: `Node`
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Plan**: Free

4. **Environment Variables**:
   ```
   NODE_ENV=production
   PORT=10000
   DATABASE_URL=<your-postgres-connection-string>
   CORS_ORIGIN=https://your-frontend-url.onrender.com
   ```

#### Step 3: Deploy Frontend
1. Go to "New +" → "Static Site"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `haccp-trace-frontend`
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `frontend/build`
   - **Plan**: Free

4. **Environment Variables**:
   ```
   REACT_APP_API_URL=https://your-backend-url.onrender.com
   REACT_APP_ENVIRONMENT=production
   ```

## Environment Variables

### Backend Environment Variables
- `NODE_ENV`: Set to `production`
- `PORT`: Port for the server (Render sets this automatically)
- `DATABASE_URL`: PostgreSQL connection string (auto-configured)
- `CORS_ORIGIN`: Frontend URL for CORS (automatically referenced from frontend service)

### Frontend Environment Variables
- `REACT_APP_API_URL`: Backend API URL (automatically referenced from backend service)
- `REACT_APP_ENVIRONMENT`: Set to `production`

### Service References
The blueprint uses Render's service reference feature to automatically configure URLs:

- **Backend URL**: Automatically referenced from the backend service using `fromService`
- **Frontend URL**: Automatically referenced from the frontend service using `fromService`

This eliminates the need to hardcode URLs and ensures the services always communicate with the correct endpoints.

## Database Configuration

The application automatically switches between:
- **Development**: SQLite database (`backend/database/haccp.sqlite`)
- **Production**: PostgreSQL database (provided by Render)

The database adapter (`backend/database/adapter.js`) handles this automatically based on the `NODE_ENV` and `DATABASE_URL` environment variables.

## Health Checks

The backend includes a health check endpoint at `/health` that Render uses to monitor the service.

## Custom Domains

To use a custom domain:
1. Go to your service settings in Render
2. Click "Custom Domains"
3. Add your domain and configure DNS

## Custom URLs

The blueprint automatically handles URL configuration using Render's service reference feature. However, if you need to override the automatic configuration:

### Option 1: Set in Render Dashboard
1. Go to your service settings in Render
2. Click "Environment"
3. Override the environment variables directly

### Option 2: Modify render.yaml
You can replace the `fromService` references with hardcoded values:
```yaml
envVars:
  - key: REACT_APP_API_URL
    value: https://your-backend-url.com
  - key: CORS_ORIGIN
    value: https://your-frontend-url.com
```

**Note**: Using service references is recommended as it automatically handles URL changes and ensures consistency.

## Monitoring and Logs

- **Logs**: Available in the Render dashboard for each service
- **Metrics**: Basic metrics provided by Render
- **Health Checks**: Automatic health monitoring

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are in package.json
   - Check build commands in render.yaml

2. **Database Connection Issues**
   - Verify DATABASE_URL is set correctly
   - Check PostgreSQL service is running
   - Ensure SSL configuration is correct

3. **CORS Errors**
   - Verify CORS_ORIGIN environment variable
   - Check frontend and backend URLs match

4. **Environment Variables**
   - Ensure all required variables are set
   - Check variable names match exactly

### Debugging Steps

1. Check service logs in Render dashboard
2. Verify environment variables are set correctly
3. Test API endpoints using the health check
4. Check database connectivity

## Security Considerations

- All environment variables are encrypted
- Database connections use SSL in production
- CORS is properly configured
- Rate limiting is enabled
- Helmet.js provides security headers

## Cost Optimization

- Use Free tier for development/testing
- Upgrade to paid plans for production workloads
- Monitor usage to avoid unexpected charges

## Support

For Render.com specific issues:
- [Render Documentation](https://render.com/docs)
- [Render Community](https://community.render.com)

For application-specific issues:
- Check the application logs
- Review the troubleshooting section above 