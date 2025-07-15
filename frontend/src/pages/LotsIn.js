import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSearch } from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-toastify';
import './LotsIn.css';

const LotsIn = () => {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingLot, setEditingLot] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [foods, setFoods] = useState([]);
  const [formData, setFormData] = useState({
    acceptance_date: '',
    lot_number: '',
    ddt_number: '',
    ddt_date: '',
    expiry_date: '',
    quantity: '',
    fk_supplier: '',
    fk_food_in: ''
  });

  useEffect(() => {
    fetchLots();
    fetchSuppliers();
    fetchFoods();
  }, []);

  const fetchLots = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/lots-in');
      setLots(response.data);
    } catch (error) {
      console.error('Error fetching lots:', error);
      toast.error('Failed to load incoming lots');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get('/api/suppliers');
      setSuppliers(response.data);
    } catch (error) {
      toast.error('Failed to load suppliers');
    }
  };

  const fetchFoods = async () => {
    try {
      const response = await axios.get('/api/foods/raw');
      setFoods(response.data);
    } catch (error) {
      toast.error('Failed to load food items');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingLot) {
        await axios.put(`/api/lots-in/${editingLot.id}`, formData);
        toast.success('Incoming lot updated successfully');
      } else {
        await axios.post('/api/lots-in', formData);
        toast.success('Incoming lot created successfully');
      }
      setShowForm(false);
      setEditingLot(null);
      resetForm();
      fetchLots();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save incoming lot');
    }
  };

  const handleEdit = (lot) => {
    setEditingLot(lot);
    setFormData({
      acceptance_date: lot.acceptance_date || '',
      lot_number: lot.lot_number || '',
      ddt_number: lot.ddt_number || '',
      ddt_date: lot.ddt_date || '',
      expiry_date: lot.expiry_date || '',
      quantity: lot.quantity || '',
      fk_supplier: lot.fk_supplier || '',
      fk_food_in: lot.fk_food_in || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (lot) => {
    if (window.confirm(`Are you sure you want to delete lot "${lot.lot_number}"?`)) {
      try {
        await axios.delete(`/api/lots-in/${lot.id}`);
        toast.success('Incoming lot deleted successfully');
        fetchLots();
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to delete incoming lot');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      acceptance_date: '',
      lot_number: '',
      ddt_number: '',
      ddt_date: '',
      expiry_date: '',
      quantity: '',
      fk_supplier: '',
      fk_food_in: ''
    });
  };

  const filteredLots = lots.filter(lot =>
    (lot.lot_number && lot.lot_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (lot.supplier_name && lot.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (lot.food_name && lot.food_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (lot.acceptance_date && lot.acceptance_date.includes(searchTerm))
  );

  if (loading) {
    return (
      <div className="lots-in-page">
        <div className="page-header">
          <h1 className="page-title">Incoming Lots</h1>
          <p className="page-subtitle">Register and manage incoming lots of raw materials</p>
        </div>
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="lots-in-page">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h1 className="page-title">Incoming Lots</h1>
            <p className="page-subtitle">Register and manage incoming lots of raw materials</p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => {
              setShowForm(true);
              setEditingLot(null);
              resetForm();
            }}
          >
            <FaPlus /> Add Incoming Lot
          </button>
        </div>
      </div>

      <div className="search-bar">
        <div className="search-input-wrapper">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search lots..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {showForm && (
        <div className="card">
          <h3>{editingLot ? 'Edit Incoming Lot' : 'Add New Incoming Lot'}</h3>
          <form onSubmit={handleSubmit} className="lotsin-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Acceptance Date *</label>
                <input
                  type="date"
                  value={formData.acceptance_date}
                  onChange={(e) => setFormData({...formData, acceptance_date: e.target.value})}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Lot Number *</label>
                <input
                  type="text"
                  value={formData.lot_number}
                  onChange={(e) => setFormData({...formData, lot_number: e.target.value})}
                  className="form-input"
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">DDT Number *</label>
                <input
                  type="text"
                  value={formData.ddt_number}
                  onChange={(e) => setFormData({...formData, ddt_number: e.target.value})}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">DDT Date *</label>
                <input
                  type="date"
                  value={formData.ddt_date}
                  onChange={(e) => setFormData({...formData, ddt_date: e.target.value})}
                  className="form-input"
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Expiry Date</label>
                <input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Quantity *</label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  className="form-input"
                  required
                  min="0"
                  step="any"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Supplier *</label>
                <select
                  value={formData.fk_supplier}
                  onChange={(e) => setFormData({...formData, fk_supplier: e.target.value})}
                  className="form-input"
                  required
                >
                  <option value="">Select supplier</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.vat})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Food Item *</label>
                <select
                  value={formData.fk_food_in}
                  onChange={(e) => setFormData({...formData, fk_food_in: e.target.value})}
                  className="form-input"
                  required
                >
                  <option value="">Select food item</option>
                  {foods.map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.unit_measure})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {editingLot ? 'Update Incoming Lot' : 'Add Incoming Lot'}
              </button>
              <button 
                type="button" 
                className="btn btn-outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingLot(null);
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
          <h3>Incoming Lots ({filteredLots.length})</h3>
        </div>
        {filteredLots.length === 0 ? (
          <div className="empty-state">
            <p>No incoming lots found. {searchTerm && 'Try adjusting your search.'}</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Acceptance Date</th>
                  <th>Lot Number</th>
                  <th>DDT Number</th>
                  <th>DDT Date</th>
                  <th>Expiry Date</th>
                  <th>Quantity</th>
                  <th>Supplier</th>
                  <th>Food Item</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLots.map(lot => (
                  <tr key={lot.id}>
                    <td>{lot.acceptance_date}</td>
                    <td>{lot.lot_number}</td>
                    <td>{lot.ddt_number}</td>
                    <td>{lot.ddt_date}</td>
                    <td>{lot.expiry_date || '-'}</td>
                    <td>{lot.quantity}</td>
                    <td>{lot.supplier_name}</td>
                    <td>{lot.food_name}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleEdit(lot)}
                          title="Edit incoming lot"
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(lot)}
                          title="Delete incoming lot"
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

export default LotsIn; 