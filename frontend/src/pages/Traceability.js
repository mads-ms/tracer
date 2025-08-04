import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Grid,
  Box,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Timeline as TimelineIcon,
  QrCode as QrCodeIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  DateRange as DateRangeIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';

const Traceability = () => {
  const [tabValue, setTabValue] = useState(0);
  const [searchType, setSearchType] = useState('lot');
  const [searchValue, setSearchValue] = useState('');
  const [traceData, setTraceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    // Set default dates (last 30 days)
    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setEndDate(end);
    setStartDate(start);
  }, []);

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      setError('Please enter a search value');
      return;
    }

    setLoading(true);
    setError('');
    setTraceData(null);

    try {
      let url = '';
      switch (searchType) {
        case 'lot':
          url = buildApiUrl(`traceability/lot/${searchValue}?type=in`);
          break;
        case 'gtin':
          url = buildApiUrl(`traceability/gtin/${searchValue}`);
          break;
        case 'customer':
          url = buildApiUrl(`traceability/customer/${searchValue}`);
          break;
        case 'supplier':
          url = buildApiUrl(`traceability/supplier/${searchValue}`);
          break;
        default:
          throw new Error('Invalid search type');
      }

      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch traceability data');
      }

      const data = await response.json();
      setTraceData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeSearch = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    setLoading(true);
    setError('');
    setReportData(null);

    try {
      const response = await fetch(buildApiUrl(`traceability/date-range/${startDate}/${endDate}`));
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch date range data');
      }

      const data = await response.json();
      setReportData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const response = await fetch(buildApiUrl(`traceability/export/${format}`));
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `traceability-export.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Export failed: ' + err.message);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const renderLotTraceability = () => {
    if (!traceData) return null;

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Lot Traceability Results
        </Typography>
        
        {traceData.incomingLot && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Incoming Lot: {traceData.incomingLot.lot_number}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    <strong>Food:</strong> {traceData.incomingLot.food_name}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Supplier:</strong> {traceData.incomingLot.supplier_name}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Acceptance Date:</strong> {formatDate(traceData.incomingLot.acceptance_date)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    <strong>Quantity:</strong> {traceData.incomingLot.quantity}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Remaining:</strong> {traceData.incomingLot.quantity_remaining}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Source:</strong> {traceData.incomingLot.source}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {traceData.outgoingLots && traceData.outgoingLots.length > 0 && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Produced Lots ({traceData.outgoingLots.length})
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Lot Number</TableCell>
                      <TableCell>Food</TableCell>
                      <TableCell>Creation Date</TableCell>
                      <TableCell>Quantity</TableCell>
                      <TableCell>GTIN</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {traceData.outgoingLots.map((lot) => (
                      <TableRow key={lot.id}>
                        <TableCell>{lot.lot_number}</TableCell>
                        <TableCell>{lot.food_name}</TableCell>
                        <TableCell>{formatDate(lot.creation_date)}</TableCell>
                        <TableCell>{lot.quantity_of_food}</TableCell>
                        <TableCell>
                          {lot.gtin_code ? (
                            <Chip label={lot.gtin_code} size="small" color="secondary" />
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {traceData.sales && traceData.sales.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sales ({traceData.sales.length})
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Invoice</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Product</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {traceData.sales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>{sale.invoice_number}</TableCell>
                        <TableCell>{formatDate(sale.invoice_date)}</TableCell>
                        <TableCell>{sale.customer_name}</TableCell>
                        <TableCell>
                          {sale.lot_out_food_name || sale.lot_in_food_name || sale.package_description}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}
      </Box>
    );
  };

  const renderDateRangeReport = () => {
    if (!reportData) return null;

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Date Range Report: {startDate} to {endDate}
        </Typography>
        
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Incoming Lots
                </Typography>
                <Typography variant="h4">
                  {reportData.summary?.totalIncomingLots || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Outgoing Lots
                </Typography>
                <Typography variant="h4">
                  {reportData.summary?.totalOutgoingLots || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Sales
                </Typography>
                <Typography variant="h4">
                  {reportData.summary?.totalSales || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Quality Checks
                </Typography>
                <Typography variant="h4">
                  {reportData.summary?.totalQualityChecks || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => handleExport('json')}
          >
            Export JSON
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => handleExport('csv')}
          >
            Export CSV
          </Button>
        </Box>
      </Box>
    );
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Traceability System
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Complete traceability tracking and reporting
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Lot Traceability" icon={<TimelineIcon />} />
          <Tab label="Date Range Report" icon={<DateRangeIcon />} />
        </Tabs>
      </Box>

      {tabValue === 0 && (
        <Box>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Search Traceability
              </Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth>
                    <InputLabel>Search Type</InputLabel>
                    <Select
                      value={searchType}
                      onChange={(e) => setSearchType(e.target.value)}
                      label="Search Type"
                    >
                      <MenuItem value="lot">Lot Number</MenuItem>
                      <MenuItem value="gtin">GTIN Code</MenuItem>
                      <MenuItem value="customer">Customer ID</MenuItem>
                      <MenuItem value="supplier">Supplier ID</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Search Value"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    placeholder={
                      searchType === 'lot' ? 'Enter lot number' :
                      searchType === 'gtin' ? 'Enter GTIN code' :
                      searchType === 'customer' ? 'Enter customer ID' :
                      'Enter supplier ID'
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<SearchIcon />}
                    onClick={handleSearch}
                    disabled={loading}
                  >
                    {loading ? 'Searching...' : 'Search'}
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {renderLotTraceability()}
        </Box>
      )}

      {tabValue === 1 && (
        <Box>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Date Range Analysis
              </Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Start Date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="End Date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<SearchIcon />}
                    onClick={handleDateRangeSearch}
                    disabled={loading}
                  >
                    {loading ? 'Generating...' : 'Generate Report'}
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {renderDateRangeReport()}
        </Box>
      )}
    </Container>
  );
};

export default Traceability; 