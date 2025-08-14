import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Alert,
  Box,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [outgoingLots, setOutgoingLots] = useState([]);
  const [incomingLots, setIncomingLots] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({});
  const [tabValue, setTabValue] = useState(0);

  const [formData, setFormData] = useState({
    invoice_number: '',
    invoice_date: '',
    fk_customer: '',
    fk_lot_out: '',
    fk_lot_in: '',
    fk_package: ''
  });

  useEffect(() => {
    fetchSales();
    fetchCustomers();
    fetchOutgoingLots();
    fetchIncomingLots();
    fetchPackages();
    fetchStats();
  }, []);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.SALES);
      if (!response.ok) throw new Error('Failed to fetch sales');
      const data = await response.json();
      setSales(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.CUSTOMERS);
      if (!response.ok) throw new Error('Failed to fetch customers');
      const data = await response.json();
      setCustomers(data);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchOutgoingLots = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.LOTS_OUT);
      if (!response.ok) throw new Error('Failed to fetch outgoing lots');
      const data = await response.json();
      setOutgoingLots(data);
    } catch (err) {
      console.error('Error fetching outgoing lots:', err);
    }
  };

  const fetchIncomingLots = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.LOTS_IN);
      if (!response.ok) throw new Error('Failed to fetch incoming lots');
      const data = await response.json();
      setIncomingLots(data);
    } catch (err) {
      console.error('Error fetching incoming lots:', err);
    }
  };

  const fetchPackages = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.PACKAGES);
      if (!response.ok) throw new Error('Failed to fetch packages');
      const data = await response.json();
      setPackages(data);
    } catch (err) {
      console.error('Error fetching packages:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(buildApiUrl('sales/stats/summary'));
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const getNextInvoiceNumber = async () => {
    try {
      const response = await fetch(buildApiUrl('sales/next-invoice-number'));
      if (!response.ok) throw new Error('Failed to get next invoice number');
      const data = await response.json();
      setFormData(prev => ({ ...prev, invoice_number: data.nextInvoiceNumber }));
    } catch (err) {
      console.error('Error getting next invoice number:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingSale 
        ? `${API_ENDPOINTS.SALES}/${editingSale.id}`
        : API_ENDPOINTS.SALES;
      
      const method = editingSale ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save sale');
      }

      setSuccess(editingSale ? 'Sale updated successfully!' : 'Sale created successfully!');
      setDialogOpen(false);
      resetForm();
      fetchSales();
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this sale?')) return;
    
    try {
      const response = await fetch(`${API_ENDPOINTS.SALES}/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete sale');
      }

      setSuccess('Sale deleted successfully!');
      fetchSales();
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (sale) => {
    setEditingSale(sale);
    setFormData({
      invoice_number: sale.invoice_number,
      invoice_date: sale.invoice_date,
      fk_customer: sale.fk_customer,
      fk_lot_out: sale.fk_lot_out || '',
      fk_lot_in: sale.fk_lot_in || '',
      fk_package: sale.fk_package || ''
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      invoice_number: '',
      invoice_date: '',
      fk_customer: '',
      fk_lot_out: '',
      fk_lot_in: '',
      fk_package: ''
    });
    setEditingSale(null);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    resetForm();
  };

  const handleAddNew = () => {
    getNextInvoiceNumber();
    setFormData(prev => ({ ...prev, invoice_date: new Date().toISOString().split('T')[0] }));
    setDialogOpen(true);
  };

  const filteredSales = sales.filter(sale =>
    sale.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.customer_vat?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.lot_out_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.lot_in_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const getProductType = (sale) => {
    if (sale.fk_lot_out) return 'Processed Food';
    if (sale.fk_lot_in) return 'Raw Material';
    if (sale.fk_package) return 'Package';
    return 'Unknown';
  };

  const getProductName = (sale) => {
    if (sale.lot_out_food_name) return sale.lot_out_food_name;
    if (sale.lot_in_food_name) return sale.lot_in_food_name;
    if (sale.package_description) return sale.package_description;
    return 'N/A';
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Sales Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage sales, invoices, and customer transactions
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Sales
              </Typography>
              <Typography variant="h4">
                {stats.totalSales || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Today's Sales
              </Typography>
              <Typography variant="h4">
                {stats.salesToday || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                This Month
              </Typography>
              <Typography variant="h4">
                {stats.salesThisMonth || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Unique Customers
              </Typography>
              <Typography variant="h4">
                {stats.uniqueCustomers || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Actions Bar */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
        >
          New Sale
        </Button>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => {
            fetchSales();
            fetchStats();
          }}
        >
          Refresh
        </Button>
        <TextField
          size="small"
          placeholder="Search sales..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
          }}
          sx={{ ml: 'auto', minWidth: 300 }}
        />
      </Box>

      {/* Sales Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Invoice #</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Product Type</TableCell>
              <TableCell>Product</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredSales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No sales found
                </TableCell>
              </TableRow>
            ) : (
              filteredSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ReceiptIcon fontSize="small" color="primary" />
                      <Typography variant="body2" fontWeight="bold">
                        {sale.invoice_number}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{formatDate(sale.invoice_date)}</TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {sale.customer_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {sale.customer_vat} • {sale.customer_city}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={getProductType(sale)} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {getProductName(sale)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(sale)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(sale.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingSale ? 'Edit Sale' : 'New Sale'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={3} sx={{ width: '100%' }}>
              {/* First row: Invoice Number and Date (2 inputs) */}
              <Grid item xs={12} md={6} sx={{ minWidth: '50%' }}>
                <TextField
                  fullWidth
                  label="Invoice Number"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  required
                  size="medium"
                  sx={{ width: '100%' }}
                />
              </Grid>
              <Grid item xs={12} md={6} sx={{ minWidth: '50%' }}>
                <TextField
                  fullWidth
                  label="Invoice Date"
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                  required
                  size="medium"
                  InputLabelProps={{ shrink: true }}
                  sx={{ width: '100%' }}
                />
              </Grid>
              
              {/* Second row: Customer (full width) */}
              <Grid item xs={12} sx={{ width: '100%' }}>
                <FormControl fullWidth size="medium" required sx={{ width: '100%' }}>
                  <InputLabel>Customer</InputLabel>
                  <Select
                    value={formData.fk_customer}
                    onChange={(e) => setFormData({ ...formData, fk_customer: e.target.value })}
                    label="Customer"
                  >
                    {customers.map((customer) => (
                      <MenuItem key={customer.id} value={customer.id}>
                        {customer.name} ({customer.vat})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Third row: Product Selection Header */}
              <Grid item xs={12} sx={{ width: '100%' }}>
                <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                  Product Selection (Select at least one)
                </Typography>
              </Grid>
              
              {/* Fourth row: Processed Food and Raw Material (2 inputs) */}
              <Grid item xs={12} md={6} sx={{ minWidth: '50%' }}>
                <FormControl fullWidth size="medium" sx={{ width: '100%' }}>
                  <InputLabel>Processed Food (Lot Out)</InputLabel>
                  <Select
                    value={formData.fk_lot_out}
                    onChange={(e) => setFormData({ ...formData, fk_lot_out: e.target.value })}
                    label="Processed Food (Lot Out)"
                  >
                    <MenuItem value="">
                      <em>No processed food</em>
                    </MenuItem>
                    {outgoingLots.map((lot) => (
                      <MenuItem key={lot.id} value={lot.id}>
                        {lot.lot_number} - {lot.food_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6} sx={{ minWidth: '50%' }}>
                <FormControl fullWidth size="medium" sx={{ width: '100%' }}>
                  <InputLabel>Raw Material (Lot In)</InputLabel>
                  <Select
                    value={formData.fk_lot_in}
                    onChange={(e) => setFormData({ ...formData, fk_lot_in: e.target.value })}
                    label="Raw Material (Lot In)"
                  >
                    <MenuItem value="">
                      <em>No raw material</em>
                    </MenuItem>
                    {incomingLots.map((lot) => (
                      <MenuItem key={lot.id} value={lot.id}>
                        {lot.lot_number} - {lot.food_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Fifth row: Package (full width) */}
              <Grid item xs={12} sx={{ width: '100%' }}>
                <FormControl fullWidth size="medium" sx={{ width: '100%' }}>
                  <InputLabel>Package</InputLabel>
                  <Select
                    value={formData.fk_package}
                    onChange={(e) => setFormData({ ...formData, fk_package: e.target.value })}
                    label="Package"
                  >
                    <MenuItem value="">
                      <em>No package</em>
                    </MenuItem>
                    {packages.map((pkg) => (
                      <MenuItem key={pkg.id} value={pkg.id}>
                        {pkg.description} ({pkg.type})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDialogClose}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingSale ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
};

export default Sales; 