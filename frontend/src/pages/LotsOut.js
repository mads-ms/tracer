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
  const [incomingLots, setIncomingLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLot, setEditingLot] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({});

  const [formData, setFormData] = useState({
    lot_number: '',
    creation_date: '',
    expiry_date: '',
    quantity_of_food: '',
    fk_food_out: '',
    fk_lot_in: ''
  });

  useEffect(() => {
    fetchLots();
    fetchFoods();
    fetchIncomingLots();
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

  const fetchStats = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.LOTS_OUT);
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      
      const totalLots = data.length;
      const totalQuantity = data.reduce((sum, lot) => sum + (lot.quantity_of_food || 0), 0);
      const lotsWithSource = data.filter(lot => lot.fk_lot_in).length;
      
      setStats({
        totalLots,
        totalQuantity,
        lotsWithSource,
        lotsWithoutSource: totalLots - lotsWithSource
      });
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

      setSuccess(editingLot ? 'Lot updated successfully!' : 'Lot created successfully!');
      setDialogOpen(false);
      resetForm();
      fetchLots();
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this lot?')) return;
    
    try {
      const response = await fetch(`${API_ENDPOINTS.LOTS_OUT}/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete lot');
      }

      setSuccess('Lot deleted successfully!');
      fetchLots();
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (lot) => {
    setEditingLot(lot);
    setFormData({
      lot_number: lot.lot_number,
      creation_date: lot.creation_date,
      expiry_date: lot.expiry_date,
      quantity_of_food: lot.quantity_of_food,
      fk_food_out: lot.fk_food_out,
      fk_lot_in: lot.fk_lot_in || ''
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      lot_number: '',
      creation_date: '',
      expiry_date: '',
      quantity_of_food: '',
      fk_food_out: '',
      fk_lot_in: ''
    });
    setEditingLot(null);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    resetForm();
  };

  const filteredLots = lots.filter(lot =>
    lot.lot_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lot.food_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lot.source_lot_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Outgoing Lots Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage production lots and track processed foods
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
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
              <Typography color="text.secondary" gutterBottom>
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
              <Typography color="text.secondary" gutterBottom>
                With Source Lot
              </Typography>
              <Typography variant="h4">
                {stats.lotsWithSource || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Without Source
              </Typography>
              <Typography variant="h4">
                {stats.lotsWithoutSource || 0}
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
          onClick={() => setDialogOpen(true)}
        >
          Add New Lot
        </Button>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => {
            fetchLots();
            fetchStats();
          }}
        >
          Refresh
        </Button>
        <TextField
          size="small"
          placeholder="Search lots..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
          }}
          sx={{ ml: 'auto', minWidth: 300 }}
        />
      </Box>

      {/* Lots Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Lot Number</TableCell>
              <TableCell>Food</TableCell>
              <TableCell>Creation Date</TableCell>
              <TableCell>Expiry Date</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Source Lot</TableCell>
              <TableCell>GTIN</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredLots.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No lots found
                </TableCell>
              </TableRow>
            ) : (
              filteredLots.map((lot) => (
                <TableRow key={lot.id}>
                  <TableCell>{lot.lot_number}</TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {lot.food_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {lot.unit_measure}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{formatDate(lot.creation_date)}</TableCell>
                  <TableCell>{formatDate(lot.expiry_date)}</TableCell>
                  <TableCell>{lot.quantity_of_food}</TableCell>
                  <TableCell>
                    {lot.source_lot_number ? (
                      <Chip 
                        label={lot.source_lot_number} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                    ) : (
                      <Chip 
                        label="No source" 
                        size="small" 
                        color="default" 
                        variant="outlined"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {lot.gtin_code ? (
                      <Chip 
                        label={lot.gtin_code} 
                        size="small" 
                        color="secondary" 
                        variant="outlined"
                      />
                    ) : (
                      '-'
                    )}
                  </TableCell>
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
                      onClick={() => handleDelete(lot.id)}
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
          {editingLot ? 'Edit Outgoing Lot' : 'Add New Outgoing Lot'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Lot Number"
                  value={formData.lot_number}
                  onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
                  required
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal" required>
                  <InputLabel>Processed Food</InputLabel>
                  <Select
                    value={formData.fk_food_out}
                    onChange={(e) => setFormData({ ...formData, fk_food_out: e.target.value })}
                    label="Processed Food"
                  >
                    {foods.map((food) => (
                      <MenuItem key={food.id} value={food.id}>
                        {food.name} ({food.unit_measure})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Creation Date"
                  type="date"
                  value={formData.creation_date}
                  onChange={(e) => setFormData({ ...formData, creation_date: e.target.value })}
                  required
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Expiry Date"
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  required
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Quantity"
                  type="number"
                  value={formData.quantity_of_food}
                  onChange={(e) => setFormData({ ...formData, quantity_of_food: e.target.value })}
                  required
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Source Lot (Optional)</InputLabel>
                  <Select
                    value={formData.fk_lot_in}
                    onChange={(e) => setFormData({ ...formData, fk_lot_in: e.target.value })}
                    label="Source Lot (Optional)"
                  >
                    <MenuItem value="">
                      <em>No source lot</em>
                    </MenuItem>
                    {incomingLots
                      .filter(lot => lot.quantity_remaining > 0)
                      .map((lot) => (
                        <MenuItem key={lot.id} value={lot.id}>
                          {lot.lot_number} - {lot.food_name} (Remaining: {lot.quantity_remaining})
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
              {editingLot ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
};

export default LotsOut; 