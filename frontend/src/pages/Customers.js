import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaTimes } from 'react-icons/fa';
import axios from 'axios';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import { toast } from 'react-toastify';
import './Customers.css';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    vat: '',
    name: '',
    address: '',
    cap: '',
    city: '',
    phone: ''
  });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetails, setCustomerDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_ENDPOINTS.CUSTOMERS);
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await axios.put(`${API_ENDPOINTS.CUSTOMERS}/${editingCustomer.id}`, formData);
        toast.success('Customer updated successfully');
      } else {
        await axios.post(API_ENDPOINTS.CUSTOMERS, formData);
        toast.success('Customer created successfully');
      }
      setShowForm(false);
      setEditingCustomer(null);
      resetForm();
      fetchCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      toast.error(error.response?.data?.error || 'Failed to save customer');
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      vat: customer.vat,
      name: customer.name,
      address: customer.address || '',
      cap: customer.cap || '',
      city: customer.city || '',
      phone: customer.phone || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (customer) => {
    if (window.confirm(`Are you sure you want to delete customer "${customer.name}"?`)) {
      try {
        await axios.delete(`${API_ENDPOINTS.CUSTOMERS}/${customer.id}`);
        toast.success('Customer deleted successfully');
        fetchCustomers();
      } catch (error) {
        console.error('Error deleting customer:', error);
        toast.error(error.response?.data?.error || 'Failed to delete customer');
      }
    }
  };

  const handleRowClick = async (customer) => {
    setSelectedCustomer(customer);
    setDetailsLoading(true);
    try {
      const response = await axios.get(buildApiUrl(`traceability/customer/${customer.id}`));
      setCustomerDetails(response.data);
    } catch (error) {
      toast.error('Failed to load customer details');
      setCustomerDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCloseDetails = () => {
    setSelectedCustomer(null);
    setCustomerDetails(null);
  };

  const resetForm = () => {
    setFormData({
      vat: '',
      name: '',
      address: '',
      cap: '',
      city: '',
      phone: ''
    });
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.vat.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.city && customer.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="customers-page">
        <div className="page-header">
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">Manage customers and sales history</p>
        </div>
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="customers-page">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h1 className="page-title">Customers</h1>
            <p className="page-subtitle">Manage customers and sales history</p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => {
              setShowForm(true);
              setEditingCustomer(null);
              resetForm();
            }}
          >
            <FaPlus /> Add Customer
          </button>
        </div>
      </div>

      <div className="search-bar">
        <div className="search-input-wrapper">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {showForm && (
        <div className="card">
          <h3>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</h3>
          <form onSubmit={handleSubmit} className="customer-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">VAT Number *</label>
                <input
                  type="text"
                  value={formData.vat}
                  onChange={(e) => setFormData({...formData, vat: e.target.value})}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="form-input"
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Address *</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">CAP *</label>
                <input
                  type="text"
                  value={formData.cap}
                  onChange={(e) => setFormData({...formData, cap: e.target.value})}
                  className="form-input"
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">City *</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone *</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="form-input"
                  required
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {editingCustomer ? 'Update Customer' : 'Add Customer'}
              </button>
              <button 
                type="button" 
                className="btn btn-outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingCustomer(null);
                  resetForm();
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="table-header">
          <h3>Customers ({filteredCustomers.length})</h3>
        </div>
        
        {filteredCustomers.length === 0 ? (
          <div className="empty-state">
            <p>No customers found. {searchTerm && 'Try adjusting your search.'}</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>VAT</th>
                  <th>Name</th>
                  <th>Address</th>
                  <th>CAP</th>
                  <th>City</th>
                  <th>Phone</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map(customer => (
                  <tr key={customer.id} onClick={() => handleRowClick(customer)} style={{ cursor: 'pointer' }}>
                    <td>{customer.vat}</td>
                    <td>{customer.name}</td>
                    <td>{customer.address}</td>
                    <td>{customer.cap}</td>
                    <td>{customer.city}</td>
                    <td>{customer.phone}</td>
                    <td>
                      <div className="action-buttons" onClick={e => e.stopPropagation()}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleEdit(customer)}
                          title="Edit customer"
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(customer)}
                          title="Delete customer"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {selectedCustomer && (
        <div className="customer-details-modal">
          <div className="customer-details-card">
            <button className="close-btn" onClick={handleCloseDetails} title="Close"><FaTimes /></button>
            <h2>Customer Details</h2>
            <p><strong>Name:</strong> {selectedCustomer.name}</p>
            <p><strong>VAT:</strong> {selectedCustomer.vat}</p>
            <p><strong>Address:</strong> {selectedCustomer.address}, {selectedCustomer.cap} {selectedCustomer.city}</p>
            <p><strong>Phone:</strong> {selectedCustomer.phone}</p>
            {detailsLoading ? (
              <div className="loading"><div className="spinner"></div></div>
            ) : customerDetails ? (
              <>
                <div className="customer-summary">
                  <h3>Sales Summary</h3>
                  <ul>
                    <li><strong>Total Sales:</strong> {customerDetails.summary.totalSales}</li>
                    <li><strong>Unique Product Types:</strong> {customerDetails.summary.uniqueProductTypes}</li>
                    <li><strong>First Purchase:</strong> {customerDetails.summary.firstPurchase || '-'}</li>
                    <li><strong>Last Purchase:</strong> {customerDetails.summary.lastPurchase || '-'}</li>
                  </ul>
                </div>
                <div className="customer-products">
                  <h3>Products Sold</h3>
                  <ul>
                    {customerDetails.uniqueProducts.map((prod, idx) => (
                      <li key={idx}>
                        <strong>{prod.product_type}:</strong> {prod.product_name} {prod.gtin_code ? `(GTIN: ${prod.gtin_code})` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="customer-sales-history">
                  <h3>Sales History</h3>
                  {customerDetails.sales.length === 0 ? (
                    <p>No sales found for this customer.</p>
                  ) : (
                    <table className="table sales-table">
                      <thead>
                        <tr>
                          <th>Invoice #</th>
                          <th>Date</th>
                          <th>Product</th>
                          <th>Type</th>
                          <th>GTIN</th>
                          <th>Quantity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerDetails.sales.map((sale, idx) => (
                          <tr key={sale.id || idx}>
                            <td>{sale.invoice_number}</td>
                            <td>{sale.invoice_date}</td>
                            <td>{sale.lot_out_food_name || sale.lot_in_food_name || sale.package_description || '-'}</td>
                            <td>{sale.fk_lot_out ? 'Processed Food' : sale.fk_lot_in ? 'Raw Material' : sale.fk_package ? 'Package' : '-'}</td>
                            <td>{sale.lot_out_gtin_code || sale.package_gtin_code || '-'}</td>
                            <td>{sale.quantity || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            ) : (
              <p>No details found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers; 