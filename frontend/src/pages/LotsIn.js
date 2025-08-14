import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSearch } from 'react-icons/fa';
import axios from 'axios';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
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
    lot_number: '',
    quantity: '',
    unit: '',
    supplier_id: '',
    food_id: '',
    production_date: '',
    expiry_date: ''
  });

  useEffect(() => {
    fetchLots();
    fetchSuppliers();
    fetchFoods();
  }, []);

  const fetchLots = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_ENDPOINTS.LOTS_IN);
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
      const response = await axios.get(API_ENDPOINTS.SUPPLIERS);
      setSuppliers(response.data);
    } catch (error) {
      toast.error('Failed to load suppliers');
    }
  };

  const fetchFoods = async () => {
    try {
      const response = await axios.get(buildApiUrl('foods/raw'));
      setFoods(response.data);
    } catch (error) {
      toast.error('Failed to load food items');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingLot) {
        await axios.put(`${API_ENDPOINTS.LOTS_IN}/${editingLot.id}`, formData);
        toast.success('Incoming lot updated successfully');
      } else {
        await axios.post(API_ENDPOINTS.LOTS_IN, formData);
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
      lot_number: lot.lot_number || '',
      quantity: lot.quantity || '',
      unit: lot.unit || '',
      supplier_id: lot.supplier_id || '',
      food_id: lot.food_id || '',
      production_date: lot.production_date || '',
      expiry_date: lot.expiry_date || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (lot) => {
    if (window.confirm(`Are you sure you want to delete lot "${lot.lot_number}"?`)) {
      try {
        await axios.delete(`${API_ENDPOINTS.LOTS_IN}/${lot.id}`);
        toast.success('Incoming lot deleted successfully');
        fetchLots();
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to delete incoming lot');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      lot_number: '',
      quantity: '',
      unit: '',
      supplier_id: '',
      food_id: '',
      production_date: '',
      expiry_date: ''
    });
  };

  const filteredLots = lots.filter(lot =>
    lot.lot_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lot.food_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lot.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="lots-in-container">
      <div className="page-header">
        <h1>Incoming Lots Management</h1>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">
          <FaPlus /> Add New Lot
        </button>
      </div>

      <div className="search-bar">
        <FaSearch />
        <input
          type="text"
          placeholder="Search lots by number, food, or supplier..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{editingLot ? 'Edit Incoming Lot' : 'Add New Incoming Lot'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
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
                <div className="form-group">
                  <label className="form-label">Quantity *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Unit *</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    className="form-input"
                    placeholder="e.g., kg, liters, pieces"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Supplier *</label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({...formData, supplier_id: e.target.value})}
                    className="form-input"
                    required
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name} ({supplier.vat})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Food Item *</label>
                  <select
                    value={formData.food_id}
                    onChange={(e) => setFormData({...formData, food_id: e.target.value})}
                    className="form-input"
                    required
                  >
                    <option value="">Select Food Item</option>
                    {foods.map(food => (
                      <option key={food.id} value={food.id}>
                        {food.name} {food.category ? `(${food.category})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Production Date</label>
                  <input
                    type="date"
                    value={formData.production_date}
                    onChange={(e) => setFormData({...formData, production_date: e.target.value})}
                    className="form-input"
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
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  {editingLot ? 'Update Lot' : 'Create Lot'}
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
                  <th>Lot Number</th>
                  <th>Food Item</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  <th>Supplier</th>
                  <th>Production Date</th>
                  <th>Expiry Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLots.map(lot => (
                  <tr key={lot.id}>
                    <td>{lot.lot_number}</td>
                    <td>{lot.food_name || '-'}</td>
                    <td>{lot.quantity}</td>
                    <td>{lot.unit}</td>
                    <td>{lot.supplier_name || '-'}</td>
                    <td>{lot.production_date || '-'}</td>
                    <td>{lot.expiry_date || '-'}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleEdit(lot)}
                          title="Edit lot"
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(lot)}
                          title="Delete lot"
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