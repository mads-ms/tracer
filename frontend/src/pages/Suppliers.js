import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSearch } from 'react-icons/fa';
import axios from 'axios';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import { toast } from 'react-toastify';
import './Suppliers.css';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    vat: '',
    name: '',
    address: '',
    phone: ''
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_ENDPOINTS.SUPPLIERS);
      setSuppliers(response.data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingSupplier) {
        await axios.put(`${API_ENDPOINTS.SUPPLIERS}/${editingSupplier.id}`, formData);
        toast.success('Supplier updated successfully');
      } else {
        await axios.post(API_ENDPOINTS.SUPPLIERS, formData);
        toast.success('Supplier created successfully');
      }
      
      setShowForm(false);
      setEditingSupplier(null);
      resetForm();
      fetchSuppliers();
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast.error(error.response?.data?.error || 'Failed to save supplier');
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      vat: supplier.vat,
      name: supplier.name,
      address: supplier.address || '',
      phone: supplier.phone || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (supplier) => {
    if (window.confirm(`Are you sure you want to delete supplier "${supplier.name}"?`)) {
      try {
        await axios.delete(`${API_ENDPOINTS.SUPPLIERS}/${supplier.id}`);
        toast.success('Supplier deleted successfully');
        fetchSuppliers();
      } catch (error) {
        console.error('Error deleting supplier:', error);
        toast.error(error.response?.data?.error || 'Failed to delete supplier');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      vat: '',
      name: '',
      address: '',
      phone: ''
    });
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.vat.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (supplier.address && supplier.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="suppliers-page">
        <div className="page-header">
          <h1 className="page-title">Suppliers</h1>
          <p className="page-subtitle">Manage food suppliers</p>
        </div>
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="suppliers-page">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h1 className="page-title">Suppliers</h1>
            <p className="page-subtitle">Manage food suppliers</p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => {
              setShowForm(true);
              setEditingSupplier(null);
              resetForm();
            }}
          >
            <FaPlus /> Add Supplier
          </button>
        </div>
      </div>

      <div className="search-bar">
        <div className="search-input-wrapper">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {showForm && (
        <div className="card">
          <h3>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h3>
          <form onSubmit={handleSubmit} className="supplier-form">
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
                <label className="form-label">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="form-input"
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {editingSupplier ? 'Update Supplier' : 'Add Supplier'}
              </button>
              <button 
                type="button" 
                className="btn btn-outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingSupplier(null);
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
          <h3>Suppliers ({filteredSuppliers.length})</h3>
        </div>
        
        {filteredSuppliers.length === 0 ? (
          <div className="empty-state">
            <p>No suppliers found. {searchTerm && 'Try adjusting your search.'}</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>VAT</th>
                  <th>Name</th>
                  <th>Address</th>
                  <th>Phone</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map(supplier => (
                  <tr key={supplier.id}>
                    <td>{supplier.vat}</td>
                    <td>{supplier.name}</td>
                    <td>{supplier.address || '-'}</td>
                    <td>{supplier.phone || '-'}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleEdit(supplier)}
                          title="Edit supplier"
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(supplier)}
                          title="Delete supplier"
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
    </div>
  );
};

export default Suppliers; 