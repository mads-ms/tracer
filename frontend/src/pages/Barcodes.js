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
  IconButton,
  Chip,
  Alert,
  Box,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  QrCode as QrCodeIcon
} from '@mui/icons-material';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';

const Barcodes = () => {
  const [barcodes, setBarcodes] = useState([]);
  const [lotsIn, setLotsIn] = useState([]);
  const [lotsOut, setLotsOut] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBarcode, setEditingBarcode] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({});

  const [formData, setFormData] = useState({
    code: '',
    type: '',
    description: '',
    fk_lot_in: '',
    fk_lot_out: '',
    fk_package: ''
  });

  useEffect(() => {
    fetchBarcodes();
    fetchLotsIn();
    fetchLotsOut();
    fetchPackages();
    fetchStats();
  }, []);

  const fetchBarcodes = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.BARCODES);
      if (!response.ok) throw new Error('Failed to fetch barcodes');
      const data = await response.json();
      setBarcodes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLotsIn = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.LOTS_IN);
      if (!response.ok) throw new Error('Failed to fetch incoming lots');
      const data = await response.json();
      setLotsIn(data);
    } catch (err) {
      console.error('Error fetching incoming lots:', err);
    }
  };

  const fetchLotsOut = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.LOTS_OUT);
      if (!response.ok) throw new Error('Failed to fetch outgoing lots');
      const data = await response.json();
      setLotsOut(data);
    } catch (err) {
      console.error('Error fetching outgoing lots:', err);
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
      const response = await fetch(buildApiUrl('barcodes/stats/summary'));
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingBarcode 
        ? `${API_ENDPOINTS.BARCODES}/${editingBarcode.id}`
        : API_ENDPOINTS.BARCODES;
      
      const method = editingBarcode ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save barcode');
      }

      setSuccess(editingBarcode ? 'Barcode updated successfully' : 'Barcode created successfully');
      setDialogOpen(false);
      setEditingBarcode(null);
      resetForm();
      fetchBarcodes();
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (barcode) => {
    setEditingBarcode(barcode);
    setFormData({
      code: barcode.code || '',
      type: barcode.type || '',
      description: barcode.description || '',
      fk_lot_in: barcode.fk_lot_in || '',
      fk_lot_out: barcode.fk_lot_out || '',
      fk_package: barcode.fk_package || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (barcode) => {
    if (window.confirm(`Are you sure you want to delete barcode "${barcode.code}"?`)) {
      try {
        const response = await fetch(`${API_ENDPOINTS.BARCODES}/${barcode.id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete barcode');
        }

        setSuccess('Barcode deleted successfully');
        fetchBarcodes();
        fetchStats();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      type: '',
      description: '',
      fk_lot_in: '',
      fk_lot_out: '',
      fk_package: ''
    });
  };

  const filteredBarcodes = barcodes.filter(barcode =>
    barcode.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    barcode.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    barcode.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <Typography>Loading barcodes...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box mb={3}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h4" component="h1">
              Barcode Management
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              Manage barcodes for lots and packages
            </Typography>
          </Grid>
          <Grid item xs={12} md={6} textAlign="right">
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingBarcode(null);
                resetForm();
                setDialogOpen(true);
              }}
            >
              Add New Barcode
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Barcodes
              </Typography>
              <Typography variant="h4">
                {stats.totalBarcodes || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Lot In Barcodes
              </Typography>
              <Typography variant="h4">
                {stats.lotInBarcodes || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Lot Out Barcodes
              </Typography>
              <Typography variant="h4">
                {stats.lotOutBarcodes || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Package Barcodes
              </Typography>
              <Typography variant="h4">
                {stats.packageBarcodes || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Actions */}
      <Box mb={3}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search barcodes by code, type, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon color="action" />
              }}
            />
          </Grid>
          <Grid item xs={12} md={6} textAlign="right">
            <Button
              startIcon={<RefreshIcon />}
              onClick={() => {
                fetchBarcodes();
                fetchStats();
              }}
            >
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Barcodes Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Barcode</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Reference</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredBarcodes.map((barcode) => (
                <TableRow key={barcode.id}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <QrCodeIcon color="primary" />
                      <Typography variant="body2" fontFamily="monospace">
                        {barcode.code}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={barcode.type} color="primary" size="small" />
                  </TableCell>
                  <TableCell>{barcode.description || '-'}</TableCell>
                  <TableCell>
                    {barcode.lot_in_number && (
                      <Chip 
                        label={`Lot In: ${barcode.lot_in_number}`} 
                        color="secondary" 
                        size="small" 
                      />
                    )}
                    {barcode.lot_out_number && (
                      <Chip 
                        label={`Lot Out: ${barcode.lot_out_number}`} 
                        color="secondary" 
                        size="small" 
                      />
                    )}
                    {barcode.package_description && (
                      <Chip 
                        label={`Package: ${barcode.package_description}`} 
                        color="secondary" 
                        size="small" 
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(barcode)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(barcode)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingBarcode ? 'Edit Barcode' : 'Add New Barcode'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Barcode Code *"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Type *"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  placeholder="e.g., QR, Code128, EAN13"
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Optional description"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Reference Lot In</InputLabel>
                  <Select
                    value={formData.fk_lot_in}
                    onChange={(e) => setFormData({...formData, fk_lot_in: e.target.value})}
                    label="Reference Lot In"
                  >
                    <MenuItem value="">None</MenuItem>
                    {lotsIn.map((lot) => (
                      <MenuItem key={lot.id} value={lot.id}>
                        {lot.lot_number} - {lot.food_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Reference Lot Out</InputLabel>
                  <Select
                    value={formData.fk_lot_out}
                    onChange={(e) => setFormData({...formData, fk_lot_out: e.target.value})}
                    label="Reference Lot Out"
                  >
                    <MenuItem value="">None</MenuItem>
                    {lotsOut.map((lot) => (
                      <MenuItem key={lot.id} value={lot.id}>
                        {lot.lot_number} - {lot.food_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Reference Package</InputLabel>
                  <Select
                    value={formData.fk_package}
                    onChange={(e) => setFormData({...formData, fk_package: e.target.value})}
                    label="Reference Package"
                  >
                    <MenuItem value="">None</MenuItem>
                    {packages.map((pkg) => (
                      <MenuItem key={pkg.id} value={pkg.id}>
                        {pkg.description} ({pkg.type})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editingBarcode ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Barcodes; 