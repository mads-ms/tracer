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
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Inventory as InventoryIcon
} from '@mui/icons-material';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';

const Packages = () => {
  const [packages, setPackages] = useState([]);
  const [barcodes, setBarcodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({});
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [foodsDialogOpen, setFoodsDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [rawFoods, setRawFoods] = useState([]);
  const [processedFoods, setProcessedFoods] = useState([]);

  const [formData, setFormData] = useState({
    type: '',
    description: '',
    measure: '',
    more_information: false,
    variable: false,
    fk_barcode: ''
  });

  useEffect(() => {
    fetchPackages();
    fetchBarcodes();
    fetchStats();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.PACKAGES);
      if (!response.ok) throw new Error('Failed to fetch packages');
      const data = await response.json();
      setPackages(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBarcodes = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.BARCODES);
      if (!response.ok) throw new Error('Failed to fetch barcodes');
      const data = await response.json();
      setBarcodes(data);
    } catch (err) {
      console.error('Error fetching barcodes:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(buildApiUrl('packages/stats/summary'));
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchPackageFoods = async (packageId) => {
    try {
      const response = await fetch(buildApiUrl(`packages/${packageId}/foods`));
      if (!response.ok) throw new Error('Failed to fetch package foods');
      const data = await response.json();
      setRawFoods(data.rawFoods || []);
      setProcessedFoods(data.processedFoods || []);
    } catch (err) {
      console.error('Error fetching package foods:', err);
    }
  };

  const fetchAllFoods = async () => {
    try {
      const [rawResponse, processedResponse] = await Promise.all([
        fetch(buildApiUrl('foods/raw')),
        fetch(buildApiUrl('foods/processed'))
      ]);
      
      if (rawResponse.ok) {
        const rawData = await rawResponse.json();
        setRawFoods(rawData);
      }
      
      if (processedResponse.ok) {
        const processedData = await processedResponse.json();
        setProcessedFoods(processedData);
      }
    } catch (err) {
      console.error('Error fetching foods:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingPackage 
        ? `${API_ENDPOINTS.PACKAGES}/${editingPackage.id}`
        : API_ENDPOINTS.PACKAGES;
      
      const method = editingPackage ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save package');
      }

      setSuccess(editingPackage ? 'Package updated successfully!' : 'Package created successfully!');
      setDialogOpen(false);
      resetForm();
      fetchPackages();
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this package?')) return;
    
    try {
      const response = await fetch(`${API_ENDPOINTS.PACKAGES}/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete package');
      }

      setSuccess('Package deleted successfully!');
      fetchPackages();
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (pkg) => {
    setEditingPackage(pkg);
    setFormData({
      type: pkg.type,
      description: pkg.description,
      measure: pkg.measure,
      more_information: pkg.more_information === 1,
      variable: pkg.variable === 1,
      fk_barcode: pkg.fk_barcode || ''
    });
    setDialogOpen(true);
  };

  const handleViewFoods = async (pkg) => {
    setSelectedPackage(pkg);
    await fetchPackageFoods(pkg.id);
    setFoodsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      type: '',
      description: '',
      measure: '',
      more_information: false,
      variable: false,
      fk_barcode: ''
    });
    setEditingPackage(null);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    resetForm();
  };

  const filteredPackages = packages.filter(pkg =>
    pkg.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pkg.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pkg.measure?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPackageTypes = () => {
    const types = [...new Set(packages.map(pkg => pkg.type))];
    return types.sort();
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Packages Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage packaging types and their associated foods
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Packages
              </Typography>
              <Typography variant="h4">
                {stats.totalPackages || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                With GTIN
              </Typography>
              <Typography variant="h4">
                {stats.packagesWithGTIN || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Package Types
              </Typography>
              <Typography variant="h4">
                {stats.packageTypes || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Without GTIN
              </Typography>
              <Typography variant="h4">
                {(stats.totalPackages || 0) - (stats.packagesWithGTIN || 0)}
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
          Add New Package
        </Button>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => {
            fetchPackages();
            fetchStats();
          }}
        >
          Refresh
        </Button>
        <TextField
          size="small"
          placeholder="Search packages..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
          }}
          sx={{ ml: 'auto', minWidth: 300 }}
        />
      </Box>

      {/* Packages Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Measure</TableCell>
              <TableCell>GTIN</TableCell>
              <TableCell>Options</TableCell>
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
            ) : filteredPackages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No packages found
                </TableCell>
              </TableRow>
            ) : (
              filteredPackages.map((pkg) => (
                <TableRow key={pkg.id}>
                  <TableCell>
                    <Chip 
                      label={pkg.type} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {pkg.description}
                    </Typography>
                  </TableCell>
                  <TableCell>{pkg.measure}</TableCell>
                  <TableCell>
                    {pkg.gtin_code ? (
                      <Chip 
                        label={pkg.gtin_code} 
                        size="small" 
                        color="secondary" 
                        variant="outlined"
                      />
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {pkg.more_information === 1 && (
                        <Chip label="More Info" size="small" color="info" />
                      )}
                      {pkg.variable === 1 && (
                        <Chip label="Variable" size="small" color="warning" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleViewFoods(pkg)}
                      color="info"
                      title="View Foods"
                    >
                      <InventoryIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(pkg)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(pkg.id)}
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
          {editingPackage ? 'Edit Package' : 'Add New Package'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Measure"
                  value={formData.measure}
                  onChange={(e) => setFormData({ ...formData, measure: e.target.value })}
                  required
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Barcode (Optional)</InputLabel>
                  <Select
                    value={formData.fk_barcode}
                    onChange={(e) => setFormData({ ...formData, fk_barcode: e.target.value })}
                    label="Barcode (Optional)"
                  >
                    <MenuItem value="">
                      <em>No Barcode</em>
                    </MenuItem>
                    {barcodes.map((barcode) => (
                      <MenuItem key={barcode.id} value={barcode.id}>
                        {barcode.code} ({barcode.type})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.more_information}
                      onChange={(e) => setFormData({ ...formData, more_information: e.target.checked })}
                    />
                  }
                  label="More Information"
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.variable}
                      onChange={(e) => setFormData({ ...formData, variable: e.target.checked })}
                    />
                  }
                  label="Variable"
                  margin="normal"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDialogClose}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingPackage ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Package Foods Dialog */}
      <Dialog open={foodsDialogOpen} onClose={() => setFoodsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Package Foods: {selectedPackage?.description}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
              <Tab label={`Raw Foods (${rawFoods.length})`} />
              <Tab label={`Processed Foods (${processedFoods.length})`} />
            </Tabs>
          </Box>
          
          {tabValue === 0 && (
            <List>
              {rawFoods.length === 0 ? (
                <ListItem>
                  <ListItemText primary="No raw foods associated with this package" />
                </ListItem>
              ) : (
                rawFoods.map((food, index) => (
                  <React.Fragment key={food.id}>
                    <ListItem>
                      <ListItemText
                        primary={food.food_name}
                        secondary={`Unit: ${food.unit_measure} | Source: ${food.source}`}
                      />
                    </ListItem>
                    {index < rawFoods.length - 1 && <Divider />}
                  </React.Fragment>
                ))
              )}
            </List>
          )}
          
          {tabValue === 1 && (
            <List>
              {processedFoods.length === 0 ? (
                <ListItem>
                  <ListItemText primary="No processed foods associated with this package" />
                </ListItem>
              ) : (
                processedFoods.map((food, index) => (
                  <React.Fragment key={food.id}>
                    <ListItem>
                      <ListItemText
                        primary={food.food_name}
                        secondary={`Unit: ${food.unit_measure} | GTIN: ${food.gtin_code || 'N/A'}`}
                      />
                    </ListItem>
                    {index < processedFoods.length - 1 && <Divider />}
                  </React.Fragment>
                ))
              )}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFoodsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Packages; 