// API Configuration
const getApiBaseUrl = () => {
  // Check if we're in production by looking at the hostname
  const isProduction = window.location.hostname !== 'localhost' && 
                      window.location.hostname !== '127.0.0.1' &&
                      !window.location.hostname.includes('localhost');
  
  if (isProduction) {
    // Production: Use the custom domain for the backend API
    return 'https://api.sabor.farm';
  }
  
  // In development, use localhost
  return 'http://localhost:3001';
};

export const API_BASE_URL = getApiBaseUrl();

// Helper function to build API URLs
export const buildApiUrl = (endpoint) => {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/api/${cleanEndpoint}`;
};

// Common API endpoints
export const API_ENDPOINTS = {
  // Company
  COMPANY: buildApiUrl('company'),
  
  // Suppliers
  SUPPLIERS: buildApiUrl('suppliers'),
  
  // Customers
  CUSTOMERS: buildApiUrl('customers'),
  
  // Foods
  FOODS: buildApiUrl('foods'),
  
  // Lots
  LOTS_IN: buildApiUrl('lots-in'),
  LOTS_OUT: buildApiUrl('lots-out'),
  
  // Packages
  PACKAGES: buildApiUrl('packages'),
  
  // Sales
  SALES: buildApiUrl('sales'),
  
  // Checks
  CHECKS: buildApiUrl('checks'),
  
  // Barcodes
  BARCODES: buildApiUrl('barcodes'),
  
  // Traceability
  TRACEABILITY: buildApiUrl('traceability'),
};

// Axios configuration (if you want to use axios)
export const axiosConfig = {
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
};

export default {
  API_BASE_URL,
  buildApiUrl,
  API_ENDPOINTS,
  axiosConfig,
}; 