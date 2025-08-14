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
  MenuItem,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  QrCode as QrCodeIcon,
  Refresh as RegenerateIcon
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

  // Standard barcode types
  const barcodeTypes = [
    { value: 'QR', label: 'QR Code', description: '2D matrix barcode' },
    { value: 'CODE128', label: 'Code 128', description: 'Linear barcode for alphanumeric data' },
    { value: 'CODE39', label: 'Code 39', description: 'Linear barcode for alphanumeric data' },
    { value: 'EAN13', label: 'EAN-13', description: 'European Article Number (13 digits)' },
    { value: 'EAN8', label: 'EAN-8', description: 'European Article Number (8 digits)' },
    { value: 'UPC', label: 'UPC-A', description: 'Universal Product Code (12 digits)' },
    { value: 'UPCE', label: 'UPC-E', description: 'Universal Product Code (8 digits)' },
    { value: 'ITF14', label: 'ITF-14', description: 'Interleaved 2 of 5 (14 digits)' },
    { value: 'DATAMATRIX', label: 'Data Matrix', description: '2D matrix barcode' },
    { value: 'PDF417', label: 'PDF417', description: '2D stacked barcode' },
    { value: 'AZTEC', label: 'Aztec Code', description: '2D matrix barcode' },
    { value: 'MAXICODE', label: 'MaxiCode', description: '2D matrix barcode for logistics' },
    { value: 'CODABAR', label: 'Codabar', description: 'Linear barcode for libraries and healthcare' },
    { value: 'INTERLEAVED2OF5', label: 'Interleaved 2 of 5', description: 'Linear barcode for numeric data' },
    { value: 'CUSTOM', label: 'Custom Format', description: 'Custom or proprietary format' }
  ];

  // Helper function to get barcode type label
  const getBarcodeTypeLabel = (typeValue) => {
    const type = barcodeTypes.find(t => t.value === typeValue);
    return type ? type.label : typeValue;
  };

  // Helper function to get barcode type color
  const getBarcodeTypeColor = (typeValue) => {
    if (typeValue === 'QR' || typeValue === 'DATAMATRIX' || typeValue === 'PDF417' || typeValue === 'AZTEC' || typeValue === 'MAXICODE') {
      return 'success'; // 2D barcodes
    } else if (typeValue === 'EAN13' || typeValue === 'EAN8' || typeValue === 'UPC' || typeValue === 'UPCE') {
      return 'primary'; // Retail barcodes
    } else if (typeValue === 'CODE128' || typeValue === 'CODE39' || typeValue === 'CODABAR' || typeValue === 'INTERLEAVED2OF5' || typeValue === 'ITF14') {
      return 'info'; // Industrial barcodes
    } else {
      return 'default'; // Custom or unknown
    }
  };

  // Helper function to get barcode type icon
  const getBarcodeTypeIcon = (typeValue) => {
    if (typeValue === 'QR') return '🔲';
    if (typeValue === 'DATAMATRIX') return '⬜';
    if (typeValue === 'PDF417') return '📄';
    if (typeValue === 'AZTEC') return '🔷';
    if (typeValue === 'MAXICODE') return '🔶';
    if (['EAN13', 'EAN8', 'UPC', 'UPCE'].includes(typeValue)) return '🏪';
    if (['CODE128', 'CODE39', 'CODABAR', 'INTERLEAVED2OF5', 'ITF14'].includes(typeValue)) return '🏭';
    return '🏷️';
  };

  // Validation function for barcode format
  const validateBarcodeFormat = (code, type) => {
    if (!code || !type) return { isValid: true, message: '' };
    
    const codeLength = code.length;
    
    switch (type) {
      case 'EAN13':
        return { 
          isValid: /^\d{13}$/.test(code), 
          message: 'EAN-13 must be exactly 13 digits' 
        };
      case 'EAN8':
        return { 
          isValid: /^\d{8}$/.test(code), 
          message: 'EAN-13 must be exactly 8 digits' 
        };
      case 'UPC':
        return { 
          isValid: /^\d{12}$/.test(code), 
          message: 'UPC-A must be exactly 12 digits' 
        };
      case 'UPCE':
        return { 
          isValid: /^\d{8}$/.test(code), 
          message: 'UPC-E must be exactly 8 digits' 
        };
      case 'ITF14':
        return { 
          isValid: /^\d{14}$/.test(code), 
          message: 'ITF-14 must be exactly 14 digits' 
        };
      case 'INTERLEAVED2OF5':
        return { 
          isValid: /^\d{6,14}$/.test(code) && codeLength % 2 === 0, 
          message: 'Interleaved 2 of 5 must be 6-14 digits (even length)' 
        };
      case 'CODABAR':
        return { 
          isValid: /^[A-D][0-9\-\$\:\/\.\+]+[A-D]$/.test(code), 
          message: 'Codabar must start/end with A-D and contain digits and special characters' 
        };
      case 'CODE39':
        return { 
          isValid: /^[0-9A-Z\-\s\.\/\+\%]+$/.test(code), 
          message: 'Code 39 can contain digits, uppercase letters, and special characters' 
        };
      case 'CODE128':
        return { 
          isValid: /^[\x20-\x7F]+$/.test(code), 
          message: 'Code 128 can contain printable ASCII characters' 
        };
      case 'QR':
      case 'DATAMATRIX':
      case 'PDF417':
      case 'AZTEC':
      case 'MAXICODE':
        return { 
          isValid: codeLength > 0, 
          message: '2D barcodes can contain any characters' 
        };
      case 'CUSTOM':
        return { 
          isValid: codeLength > 0, 
          message: 'Custom format - any characters allowed' 
        };
      default:
        return { 
          isValid: true, 
          message: '' 
        };
    }
  };

  // Generate barcode code based on type
  const generateBarcodeCode = (type) => {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    switch (type) {
      case 'EAN13':
        // Generate 12 digits + calculate check digit
        const ean13Base = Math.floor(Math.random() * 900000000000) + 100000000000;
        const ean13Check = calculateEAN13CheckDigit(ean13Base.toString());
        return (ean13Base * 10 + ean13Check).toString();
      
      case 'EAN8':
        // Generate 7 digits + calculate check digit
        const ean8Base = Math.floor(Math.random() * 9000000) + 1000000;
        const ean8Check = calculateEAN8CheckDigit(ean8Base.toString());
        return (ean8Base * 10 + ean8Check).toString();
      
      case 'UPC':
        // Generate 11 digits + calculate check digit
        const upcBase = Math.floor(Math.random() * 90000000000) + 10000000000;
        const upcCheck = calculateUPCACheckDigit(upcBase.toString());
        return (upcBase * 10 + upcCheck).toString();
      
      case 'UPCE':
        // Generate 7 digits + calculate check digit
        const upceBase = Math.floor(Math.random() * 9000000) + 1000000;
        const upceCheck = calculateUPCEACheckDigit(upceBase.toString());
        return (upceBase * 10 + upceCheck).toString();
      
      case 'ITF14':
        // Generate 13 digits + calculate check digit
        const itf14Base = Math.floor(Math.random() * 9000000000000) + 1000000000000;
        const itf14Check = calculateITF14CheckDigit(itf14Base.toString());
        return (itf14Base * 10 + itf14Check).toString();
      
      case 'INTERLEAVED2OF5':
        // Generate even length (6-14 digits)
        const length = Math.floor(Math.random() * 5) * 2 + 6; // 6, 8, 10, 12, 14
        return Array.from({length}, () => Math.floor(Math.random() * 10)).join('');
      
      case 'CODABAR':
        // Generate Codabar format: A + digits/special + D
        const codabarChars = '0123456789-$:/.+';
        const codabarLength = Math.floor(Math.random() * 8) + 4; // 4-12 chars
        const codabarMiddle = Array.from({length: codabarLength}, () => 
          codabarChars[Math.floor(Math.random() * codabarChars.length)]
        ).join('');
        return `A${codabarMiddle}D`;
      
      case 'CODE39':
        // Generate Code 39 format: alphanumeric + special chars
        const code39Chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. /+%';
        const code39Length = Math.floor(Math.random() * 10) + 6; // 6-16 chars
        return Array.from({length: code39Length}, () => 
          code39Chars[Math.floor(Math.random() * code39Chars.length)]
        ).join('');
      
      case 'CODE128':
        // Generate Code 128 format: printable ASCII
        const code128Length = Math.floor(Math.random() * 15) + 8; // 8-23 chars
        return Array.from({length: code128Length}, () => 
          String.fromCharCode(Math.floor(Math.random() * 95) + 32) // ASCII 32-126
        );
      
      case 'QR':
      case 'DATAMATRIX':
      case 'PDF417':
      case 'AZTEC':
      case 'MAXICODE':
        // Generate meaningful 2D barcode content
        return `PROD-${timestamp.slice(-8)}-${random}`;
      
      case 'CUSTOM':
        // Generate custom format
        return `CUST-${timestamp.slice(-8)}-${random}`;
      
      default:
        return `GEN-${timestamp.slice(-8)}-${random}`;
    }
  };

  // Check digit calculation functions
  const calculateEAN13CheckDigit = (digits) => {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(digits[i]) * (i % 2 === 0 ? 1 : 3);
    }
    return (10 - (sum % 10)) % 10;
  };

  const calculateEAN8CheckDigit = (digits) => {
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      sum += parseInt(digits[i]) * (i % 2 === 0 ? 3 : 1);
    }
    return (10 - (sum % 10)) % 10;
  };

  const calculateUPCACheckDigit = (digits) => {
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      sum += parseInt(digits[i]) * (i % 2 === 0 ? 3 : 1);
    }
    return (10 - (sum % 10)) % 10;
  };

  const calculateUPCEACheckDigit = (digits) => {
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      sum += parseInt(digits[i]) * (i % 2 === 0 ? 3 : 1);
    }
    return (10 - (sum % 10)) % 10;
  };

  const calculateITF14CheckDigit = (digits) => {
    let sum = 0;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(digits[i]) * (i % 2 === 0 ? 3 : 1);
    }
    return (10 - (sum % 10)) % 10;
  };

  const handleGenerateCode = () => {
    if (!formData.type) {
      setError('Please select a barcode type first');
      return;
    }
    
    const generatedCode = generateBarcodeCode(formData.type);
    setFormData({...formData, code: generatedCode});
    setSuccess(`Generated ${getBarcodeTypeLabel(formData.type)} barcode: ${generatedCode}`);
  };

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
    
    // Validate barcode format
    if (formData.type && formData.code) {
      const validation = validateBarcodeFormat(formData.code, formData.type);
      if (!validation.isValid) {
        setError(`Invalid barcode format: ${validation.message}`);
        return;
      }
    }
    
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

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingBarcode(null);
    resetForm();
    setError('');
  };

  const handleTypeChange = (newType) => {
    setFormData({...formData, type: newType, code: ''}); // Clear code when type changes
    
    // Auto-generate code if this is a new barcode (not editing)
    if (newType && !editingBarcode) {
      setTimeout(() => {
        const generatedCode = generateBarcodeCode(newType);
        setFormData(prev => ({...prev, code: generatedCode}));
        setSuccess(`Auto-generated ${getBarcodeTypeLabel(newType)} barcode: ${generatedCode}`);
      }, 100); // Small delay to ensure state is updated
    }
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
                    <Tooltip title={barcodeTypes.find(t => t.value === barcode.type)?.description}>
                      <Chip 
                        label={`${getBarcodeTypeIcon(barcode.type)} ${getBarcodeTypeLabel(barcode.type)}`} 
                        color={getBarcodeTypeColor(barcode.type)} 
                        size="small" 
                      />
                    </Tooltip>
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
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingBarcode ? 'Edit Barcode' : 'Add New Barcode'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Grid container spacing={3} sx={{ width: '100%' }}>
              {/* First row: Type (full width) */}
              <Grid item xs={12} sx={{ width: '100%' }}>
                <FormControl fullWidth size="medium" sx={{ width: '100%' }}>
                  <InputLabel>Barcode Type *</InputLabel>
                  <Select
                    value={formData.type}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    label="Barcode Type *"
                    required
                  >
                    <MenuItem value="">
                      <em>Select a barcode type</em>
                    </MenuItem>
                    {barcodeTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {formData.type && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Format: {getBarcodeTypeLabel(formData.type)} - {barcodeTypes.find(t => t.value === formData.type)?.description}
                  </Typography>
                )}
              </Grid>
              
              {/* Second row: Code (full width) */}
              <Grid item xs={12} sx={{ width: '100%' }}>
                <TextField
                  fullWidth
                  label="Barcode Code *"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  required
                  size="medium"
                  sx={{ width: '100%' }}
                  error={formData.type && formData.code && !validateBarcodeFormat(formData.code, formData.type).isValid}
                  helperText={formData.type && formData.code ? validateBarcodeFormat(formData.code, formData.type).message : ''}
                />
                {formData.type && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Format: {getBarcodeTypeLabel(formData.type)} - {barcodeTypes.find(t => t.value === formData.type)?.description}
                  </Typography>
                )}
                {formData.code && (
                  <Box sx={{ 
                    mt: 1, 
                    p: 1.5, 
                    bgcolor: 'grey.50', 
                    border: '1px solid', 
                    borderColor: 'grey.300',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <Typography variant="body2" fontFamily="monospace" sx={{ fontWeight: 'bold' }}>
                      {formData.code}
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => {
                        navigator.clipboard.writeText(formData.code);
                        setSuccess('Barcode code copied to clipboard!');
                      }}
                      sx={{ ml: 1 }}
                    >
                      Copy
                    </Button>
                  </Box>
                )}
                <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<QrCodeIcon />}
                    onClick={handleGenerateCode}
                    size="small"
                    disabled={!formData.type}
                  >
                    Generate Code
                  </Button>
                  {formData.code && (
                    <Button
                      variant="outlined"
                      color="secondary"
                      startIcon={<RegenerateIcon />}
                      onClick={handleGenerateCode}
                      size="small"
                      disabled={!formData.type}
                    >
                      Regenerate
                    </Button>
                  )}
                </Box>
              </Grid>
              
              {/* Third row: Description (full width) */}
              <Grid item xs={12} sx={{ width: '100%' }}>
                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Optional description"
                  size="medium"
                  multiline
                  rows={2}
                  sx={{ width: '100%' }}
                />
              </Grid>
              
              {/* Fourth row: Reference Lot In (full width) */}
              <Grid item xs={12} sx={{ width: '100%' }}>
                <FormControl fullWidth size="medium" sx={{ width: '100%' }}>
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
              
              {/* Fifth row: Reference Lot Out (full width) */}
              <Grid item xs={12} sx={{ width: '100%' }}>
                <FormControl fullWidth size="medium" sx={{ width: '100%' }}>
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
              
              {/* Sixth row: Reference Package (full width) */}
              <Grid item xs={12} sx={{ width: '100%' }}>
                <FormControl fullWidth size="medium" sx={{ width: '100%' }}>
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
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editingBarcode ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Barcodes; 