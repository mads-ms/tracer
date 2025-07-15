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
  QrCode as QrCodeIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

const Barcodes = () => {
  const [gtinCodes, setGtinCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGtin, setEditingGtin] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({});
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [validationCode, setValidationCode] = useState('');
  const [validationResult, setValidationResult] = useState(null);
  const [generationDialogOpen, setGenerationDialogOpen] = useState(false);
  const [generationData, setGenerationData] = useState({
    prefix: '',
    startNumber: 1
  });

  const [formData, setFormData] = useState({
    code: '',
    progressive: 0
  });

  useEffect(() => {
    fetchGtinCodes();
    fetchStats();
  }, []);

  const fetchGtinCodes = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/barcodes');
      if (!response.ok) throw new Error('Failed to fetch GTIN codes');
      const data = await response.json();
      setGtinCodes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/barcodes/stats/summary');
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
      const url = editingGtin 
        ? `http://localhost:3001/api/barcodes/${editingGtin.id}`
        : 'http://localhost:3001/api/barcodes';
      
      const method = editingGtin ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save GTIN');
      }

      setSuccess(editingGtin ? 'GTIN updated successfully!' : 'GTIN created successfully!');
      setDialogOpen(false);
      resetForm();
      fetchGtinCodes();
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this GTIN?')) return;
    
    try {
      const response = await fetch(`http://localhost:3001/api/barcodes/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete GTIN');
      }

      setSuccess('GTIN deleted successfully!');
      fetchGtinCodes();
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (gtin) => {
    setEditingGtin(gtin);
    setFormData({
      code: gtin.code,
      progressive: gtin.progressive
    });
    setDialogOpen(true);
  };

  const handleValidate = async () => {
    if (!validationCode.trim()) {
      setError('Please enter a GTIN code to validate');
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/barcodes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: validationCode })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Validation failed');
      }

      const result = await response.json();
      setValidationResult(result);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGenerate = async () => {
    if (!generationData.prefix.trim()) {
      setError('Please enter a prefix');
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/barcodes/generate/next?prefix=${generationData.prefix}&startNumber=${generationData.startNumber}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      const result = await response.json();
      setFormData({
        code: result.gtinCode,
        progressive: result.nextProgressive
      });
      setGenerationDialogOpen(false);
      setDialogOpen(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      progressive: 0
    });
    setEditingGtin(null);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    resetForm();
  };

  const filteredGtinCodes = gtinCodes.filter(gtin =>
    gtin.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const validateGTINFormat = (code) => {
    return /^\d{13}$/.test(code);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          GTIN Barcodes Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage GTIN-13 codes for product identification
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total GTINs
              </Typography>
              <Typography variant="h4">
                {stats.totalGTINs || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                With Foods
              </Typography>
              <Typography variant="h4">
                {stats.gtinWithFoods || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                With Packages
              </Typography>
              <Typography variant="h4">
                {stats.gtinWithPackages || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Unused
              </Typography>
              <Typography variant="h4">
                {stats.unusedGTINs || 0}
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
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Add GTIN
        </Button>
        <Button
          variant="outlined"
          startIcon={<QrCodeIcon />}
          onClick={() => setGenerationDialogOpen(true)}
        >
          Generate GTIN
        </Button>
        <Button
          variant="outlined"
          startIcon={<CheckCircleIcon />}
          onClick={() => setValidationDialogOpen(true)}
        >
          Validate GTIN
        </Button>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => {
            fetchGtinCodes();
            fetchStats();
          }}
        >
          Refresh
        </Button>
        <TextField
          size="small"
          placeholder="Search GTIN codes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
          }}
          sx={{ ml: 'auto', minWidth: 300 }}
        />
      </Box>

      {/* GTIN Codes Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>GTIN Code</TableCell>
              <TableCell>Progressive</TableCell>
              <TableCell>Food Count</TableCell>
              <TableCell>Package Count</TableCell>
              <TableCell>Status</TableCell>
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
            ) : filteredGtinCodes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No GTIN codes found
                </TableCell>
              </TableRow>
            ) : (
              filteredGtinCodes.map((gtin) => (
                <TableRow key={gtin.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <QrCodeIcon fontSize="small" color="primary" />
                      <Typography variant="body2" fontWeight="bold" fontFamily="monospace">
                        {gtin.code}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{gtin.progressive}</TableCell>
                  <TableCell>
                    <Chip 
                      label={gtin.food_count || 0} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={gtin.package_count || 0} 
                      size="small" 
                      color="secondary" 
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {gtin.food_count > 0 || gtin.package_count > 0 ? (
                      <Chip label="In Use" size="small" color="success" />
                    ) : (
                      <Chip label="Unused" size="small" color="default" />
                    )}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(gtin)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(gtin.id)}
                      color="error"
                      disabled={gtin.food_count > 0 || gtin.package_count > 0}
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
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingGtin ? 'Edit GTIN' : 'Add New GTIN'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="GTIN Code (13 digits)"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                  margin="normal"
                  inputProps={{ maxLength: 13 }}
                  error={formData.code && !validateGTINFormat(formData.code)}
                  helperText={formData.code && !validateGTINFormat(formData.code) ? 'GTIN must be exactly 13 digits' : ''}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Progressive Number"
                  type="number"
                  value={formData.progressive}
                  onChange={(e) => setFormData({ ...formData, progressive: parseInt(e.target.value) || 0 })}
                  margin="normal"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDialogClose}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingGtin ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Validation Dialog */}
      <Dialog open={validationDialogOpen} onClose={() => setValidationDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Validate GTIN Code</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="GTIN Code"
              value={validationCode}
              onChange={(e) => setValidationCode(e.target.value)}
              margin="normal"
              inputProps={{ maxLength: 13 }}
            />
          </Box>
          {validationResult && (
            <Box sx={{ mt: 2 }}>
              <Alert 
                severity={validationResult.valid ? 'success' : 'error'}
                icon={validationResult.valid ? <CheckCircleIcon /> : <ErrorIcon />}
              >
                <Typography variant="body2">
                  <strong>GTIN:</strong> {validationResult.code}
                </Typography>
                <Typography variant="body2">
                  <strong>Provided Check Digit:</strong> {validationResult.providedCheckDigit}
                </Typography>
                <Typography variant="body2">
                  <strong>Calculated Check Digit:</strong> {validationResult.calculatedCheckDigit}
                </Typography>
                <Typography variant="body2">
                  <strong>Valid:</strong> {validationResult.valid ? 'Yes' : 'No'}
                </Typography>
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setValidationDialogOpen(false)}>Close</Button>
          <Button onClick={handleValidate} variant="contained">
            Validate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Generation Dialog */}
      <Dialog open={generationDialogOpen} onClose={() => setGenerationDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generate Next GTIN</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Prefix (12 digits)"
                value={generationData.prefix}
                onChange={(e) => setGenerationData({ ...generationData, prefix: e.target.value })}
                margin="normal"
                inputProps={{ maxLength: 12 }}
                error={generationData.prefix && !/^\d{12}$/.test(generationData.prefix)}
                helperText={generationData.prefix && !/^\d{12}$/.test(generationData.prefix) ? 'Prefix must be exactly 12 digits' : ''}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Start Number"
                type="number"
                value={generationData.startNumber}
                onChange={(e) => setGenerationData({ ...generationData, startNumber: parseInt(e.target.value) || 1 })}
                margin="normal"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenerationDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleGenerate} variant="contained">
            Generate
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Barcodes; 