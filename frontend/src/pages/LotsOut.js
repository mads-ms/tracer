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
  CardContent
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';

const LotsOut = () => {
  const [lots, setLots] = useState([]);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLot, setEditingLot] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({});

  const [formData, setFormData] = useState({
    lot_number: '',
    quantity: '',
    unit: '',
    food_id: '',
    production_date: '',
    expiry_date: ''
  });

  useEffect(() => {
    fetchLots();
    fetchFoods();
    fetchStats();
  }, []);

  const fetchLots = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.LOTS_OUT);
      if (!response.ok) throw new Error('Failed to fetch lots');
      const data = await response.json();
      setLots(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFoods = async () => {
    try {
      const response = await fetch(buildApiUrl('foods/processed'));
      if (!response.ok) throw new Error('Failed to fetch foods');
      const data = await response.json();
      setFoods(data);
    } catch (err) {
      console.error('Error fetching foods:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(buildApiUrl('lots-out/stats/summary'));
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
      const url = editingLot 
        ? `${API_ENDPOINTS.LOTS_OUT}/${editingLot.id}`
        : API_ENDPOINTS.LOTS_OUT;
      
      const method = editingLot ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save lot');
      }

      setSuccess(editingLot ? 'Lot updated successfully' : 'Lot created successfully');
      setDialogOpen(false);
      setEditingLot(null);
      resetForm();
      fetchLots();
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (lot) => {
    setEditingLot(lot);
    setFormData({
      lot_number: lot.lot_number || '',
      quantity: lot.quantity || '',
      unit: lot.unit || '',
      food_id: lot.food_id || '',
      production_date: lot.production_date || '',
      expiry_date: lot.expiry_date || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (lot) => {
    if (window.confirm(`Are you sure you want to delete lot "${lot.lot_number}"?`)) {
      try {
        const response = await fetch(`${API_ENDPOINTS.LOTS_OUT}/${lot.id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete lot');
        }

        setSuccess('Lot deleted successfully');
        fetchLots();
        fetchStats();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      lot_number: '',
      quantity: '',
      unit: '',
      food_id: '',
      production_date: '',
      expiry_date: ''
    });
  };

  const filteredLots = lots.filter(lot =>
    lot.lot_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lot.food_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <Typography>Loading outgoing lots...</Typography>
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
              Outgoing Lots Management
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              Manage processed food lots and production batches
            </Typography>
          </Grid>
          <Grid item xs={12} md={6} textAlign="right">
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingLot(null);
                resetForm();
                setDialogOpen(true);
              }}
            >
              Add New Lot
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
                Total Lots
              </Typography>
              <Typography variant="h4">
                {stats.totalLots || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Quantity
              </Typography>
              <Typography variant="h4">
                {stats.totalQuantity || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Expiring Soon
              </Typography>
              <Typography variant="h4">
                {stats.expiringSoon || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Food Types
              </Typography>
              <Typography variant="h4">
                {stats.foodsCount || 0}
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
              placeholder="Search lots by number or food..."
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
                fetchLots();
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

      {/* Lots Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Lot Number</TableCell>
                <TableCell>Food Item</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Unit</TableCell>
                <TableCell>Production Date</TableCell>
                <TableCell>Expiry Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLots.map((lot) => (
                <TableRow key={lot.id}>
                  <TableCell>{lot.lot_number}</TableCell>
                  <TableCell>{lot.food_name || '-'}</TableCell>
                  <TableCell>{lot.quantity}</TableCell>
                  <TableCell>{lot.unit}</TableCell>
                  <TableCell>{lot.production_date || '-'}</TableCell>
                  <TableCell>{lot.expiry_date || '-'}</TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(lot)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(lot)}
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
          {editingLot ? 'Edit Outgoing Lot' : 'Add New Outgoing Lot'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              {/* First row: Lot Number and Quantity (2 inputs) */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Lot Number *"
                  value={formData.lot_number}
                  onChange={(e) => setFormData({...formData, lot_number: e.target.value})}
                  required
                  size="medium"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Quantity *"
                  type="number"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  required
                  size="medium"
                />
              </Grid>
              
              {/* Second row: Unit and Food Item (2 inputs) */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Unit *"
                  value={formData.unit}
                  onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  placeholder="e.g., kg, liters, pieces"
                  required
                  size="medium"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required size="medium">
                  <InputLabel>Food Item *</InputLabel>
                  <Select
                    value={formData.food_id}
                    onChange={(e) => setFormData({...formData, food_id: e.target.value})}
                    label="Food Item *"
                  >
                    {foods.map((food) => (
                      <MenuItem key={food.id} value={food.id}>
                        {food.name} {food.category ? `(${food.category})` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Third row: Production Date and Expiry Date (2 inputs) */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Production Date"
                  type="date"
                  value={formData.production_date}
                  onChange={(e) => setFormData({...formData, production_date: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                  size="medium"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Expiry Date"
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                  size="medium"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editingLot ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default LotsOut; 