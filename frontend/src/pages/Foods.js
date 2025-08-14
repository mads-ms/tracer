import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Button,
  Tabs,
  Tab,
  Box,
  Card,
  CardContent,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Category as CategoryIcon,
  LocalShipping as LocalShippingIcon,
  Inventory as InventoryIcon
} from '@mui/icons-material';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';

const Foods = () => {
  const [foods, setFoods] = useState([]);
  const [rawFoods, setRawFoods] = useState([]);
  const [processedFoods, setProcessedFoods] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [showRawModal, setShowRawModal] = useState(false);
  const [showProcessedModal, setShowProcessedModal] = useState(false);
  const [editRaw, setEditRaw] = useState({ name: '', description: '', category: '', supplier_id: '' });
  const [editProcessed, setEditProcessed] = useState({ name: '', description: '', category: '' });

  const API_BASE = API_ENDPOINTS.FOODS;

  // Fetch foods
  const fetchFoods = async (query) => {
    setLoading(true);
    setError(null);
    try {
      let url = API_BASE + (query ? `/search/${encodeURIComponent(query)}` : '/list');
      const res = await fetch(url);
      
      // Check if response is ok
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      
      // Ensure data is an array
      const foodsArray = Array.isArray(data) ? data : [];
      
      // Separate raw and processed foods
      const raw = foodsArray.filter(food => food.type === 'raw' || !food.type);
      const processed = foodsArray.filter(food => food.type === 'processed');
      
      setRawFoods(raw);
      setProcessedFoods(processed);
      setFoods(foodsArray);
    } catch (err) {
      console.error('Error fetching foods:', err);
      setError('Failed to fetch foods');
      setRawFoods([]);
      setProcessedFoods([]);
      setFoods([]);
    }
    setLoading(false);
  };

  // Fetch suppliers
  const fetchSuppliers = async () => {
    try {
      const res = await fetch(API_ENDPOINTS.SUPPLIERS);
      
      // Check if response is ok
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      
      // Ensure data is an array
      const suppliersArray = Array.isArray(data) ? data : [];
      setSuppliers(suppliersArray);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      setSuppliers([]);
    }
  };

  useEffect(() => {
    fetchFoods();
    fetchSuppliers();
  }, []);

  // Search handler
  const handleSearch = (e) => {
    setSearch(e.target.value);
    fetchFoods(e.target.value);
  };

  // Tab handler
  const handleTab = (tab) => setActiveTab(tab);

  // CRUD handlers for raw foods
  const handleAddRaw = () => {
    setEditRaw({ name: '', description: '', category: '', supplier_id: '' });
    setShowRawModal(true);
  };
  
  const handleEditRaw = (food) => {
    setEditRaw(food);
    setShowRawModal(true);
  };
  
  const handleDeleteRaw = async (id) => {
    if (!window.confirm('Delete this raw food?')) return;
    try {
      await fetch(`${API_BASE}/raw/${id}`, { method: 'DELETE' });
      fetchFoods(search);
    } catch (err) {
      console.error('Error deleting raw food:', err);
    }
  };

  // CRUD handlers for processed foods
  const handleAddProcessed = () => {
    setEditProcessed({ name: '', description: '', category: '' });
    setShowProcessedModal(true);
  };
  
  const handleEditProcessed = (food) => {
    setEditProcessed(food);
    setShowProcessedModal(true);
  };
  
  const handleDeleteProcessed = async (id) => {
    if (!window.confirm('Delete this processed food?')) return;
    try {
      await fetch(`${API_BASE}/processed/${id}`, { method: 'DELETE' });
      fetchFoods(search);
    } catch (err) {
      console.error('Error deleting processed food:', err);
    }
  };

  // Form handlers
  const handleRawSubmit = async (e) => {
    e.preventDefault();
    try {
      const method = editRaw?.id ? 'PUT' : 'POST';
      const url = editRaw?.id ? `${API_BASE}/raw/${editRaw.id}` : `${API_BASE}/raw`;
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editRaw)
      });

      if (!response.ok) {
        throw new Error('Failed to save raw food');
      }

      setShowRawModal(false);
      fetchFoods(search);
    } catch (err) {
      console.error('Error saving raw food:', err);
    }
  };

  const handleProcessedSubmit = async (e) => {
    e.preventDefault();
    try {
      const method = editProcessed?.id ? 'PUT' : 'POST';
      const url = editProcessed?.id ? `${API_BASE}/processed/${editProcessed.id}` : `${API_BASE}/processed`;
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: editProcessed
      });

      if (!response.ok) {
        throw new Error('Failed to save processed food');
      }

      setShowProcessedModal(false);
      fetchFoods(search);
    } catch (err) {
      console.error('Error saving processed food:', err);
    }
  };

  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <Typography>Loading foods...</Typography>
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
              Food Management
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              Manage raw materials and processed foods
            </Typography>
          </Grid>
          <Grid item xs={12} md={6} textAlign="right">
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddRaw}
              sx={{ mr: 1 }}
            >
              Add Raw Food
            </Button>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddProcessed}
            >
              Add Processed Food
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Search and Actions */}
      <Box mb={3}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search foods..."
              value={search}
              onChange={handleSearch}
              InputProps={{
                startAdornment: <SearchIcon color="action" />
              }}
            />
          </Grid>
          <Grid item xs={12} md={6} textAlign="right">
            <Button
              startIcon={<RefreshIcon />}
              onClick={() => fetchFoods()}
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

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => handleTab(newValue)}>
          <Tab 
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <LocalShippingIcon />
                Raw Foods ({rawFoods.length})
              </Box>
            } 
          />
          <Tab 
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <InventoryIcon />
                Processed Foods ({processedFoods.length})
              </Box>
            } 
          />
        </Tabs>
      </Box>

      {/* Raw Foods Tab */}
      {activeTab === 0 && (
        <div>
          <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Raw Materials</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddRaw}
            >
              Add Raw Food
            </Button>
          </Box>
          
          {rawFoods.length === 0 ? (
            <Card>
              <CardContent>
                <Typography color="textSecondary" align="center">
                  No raw foods found. Add some raw materials to get started.
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Supplier</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rawFoods.map((food) => (
                    <TableRow key={food.id}>
                      <TableCell>{food.name}</TableCell>
                      <TableCell>{food.description || '-'}</TableCell>
                      <TableCell>
                        {food.category && (
                          <Chip label={food.category} size="small" color="primary" />
                        )}
                      </TableCell>
                      <TableCell>{food.supplier_name || '-'}</TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleEditRaw(food)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteRaw(food.id)}
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
          )}
        </div>
      )}

      {/* Processed Foods Tab */}
      {activeTab === 1 && (
        <div>
          <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Processed Foods</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddProcessed}
            >
              Add Processed Food
            </Button>
          </Box>
          
          {processedFoods.length === 0 ? (
            <Card>
              <CardContent>
                <Typography color="textSecondary" align="center">
                  No processed foods found. Add some processed foods to get started.
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {processedFoods.map((food) => (
                    <TableRow key={food.id}>
                      <TableCell>{food.name}</TableCell>
                      <TableCell>{food.description || '-'}</TableCell>
                      <TableCell>
                        {food.category && (
                          <Chip label={food.category} size="small" color="primary" />
                        )}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleEditProcessed(food)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteProcessed(food.id)}
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
          )}
        </div>
      )}

      {/* Raw Food Modal */}
      <Dialog open={showRawModal} onClose={() => setShowRawModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editRaw?.id ? 'Edit Raw Food' : 'Add Raw Food'}
        </DialogTitle>
        <form onSubmit={handleRawSubmit}>
          <DialogContent sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Name *"
                  value={editRaw.name}
                  onChange={(e) => setEditRaw({...editRaw, name: e.target.value})}
                  required
                  size="medium"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={editRaw.description}
                  onChange={(e) => setEditRaw({...editRaw, description: e.target.value})}
                  multiline
                  rows={4}
                  size="medium"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Category"
                  value={editRaw.category}
                  onChange={(e) => setEditRaw({...editRaw, category: e.target.value})}
                  size="medium"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="medium">
                  <InputLabel id="supplier-label">Supplier</InputLabel>
                  <Select
                    labelId="supplier-label"
                    value={editRaw.supplier_id}
                    onChange={(e) => setEditRaw({...editRaw, supplier_id: e.target.value})}
                    label="Supplier"
                    MenuProps={{
                      PaperProps: {
                        style: {
                          maxHeight: 300,
                          minWidth: 300
                        }
                      }
                    }}
                  >
                    <MenuItem value="">
                      <em>No Supplier</em>
                    </MenuItem>
                    {suppliers.map((supplier) => (
                      <MenuItem 
                        key={supplier.id} 
                        value={supplier.id}
                      >
                        {supplier.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setShowRawModal(false)} size="large">
              Cancel
            </Button>
            <Button type="submit" variant="contained" size="large">
              {editRaw?.id ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Processed Food Modal */}
      <Dialog open={showProcessedModal} onClose={() => setShowProcessedModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editProcessed?.id ? 'Edit Processed Food' : 'Add Processed Food'}
        </DialogTitle>
        <form onSubmit={handleProcessedSubmit}>
          <DialogContent sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Name *"
                  value={editProcessed.name}
                  onChange={(e) => setEditProcessed({...editProcessed, name: e.target.value})}
                  required
                  size="medium"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={editProcessed.description}
                  onChange={(e) => setEditProcessed({...editProcessed, description: e.target.value})}
                  multiline
                  rows={4}
                  size="medium"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Category"
                  value={editProcessed.category}
                  onChange={(e) => setEditProcessed({...editProcessed, category: e.target.value})}
                  size="medium"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setShowProcessedModal(false)} size="large">
              Cancel
            </Button>
            <Button type="submit" variant="contained" size="large">
              {editProcessed?.id ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
};

export default Foods; 