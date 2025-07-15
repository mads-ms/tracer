import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSearch } from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-toastify';
import './Checks.css';

const Checks = () => {
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCheck, setEditingCheck] = useState(null);
  const [lots, setLots] = useState([]);
  const [formData, setFormData] = useState({
    fk_lot_in: '',
    date: '',
    protocol: '',
    qt_controlled: '',
    qt_non_compliant: '',
    dim_calib: ''
  });

  useEffect(() => {
    fetchChecks();
    fetchLots();
  }, []);

  const fetchChecks = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/checks');
      setChecks(response.data);
    } catch (error) {
      toast.error('Failed to load quality checks');
    } finally {
      setLoading(false);
    }
  };

  const fetchLots = async () => {
    try {
      const response = await axios.get('/api/lots-in');
      setLots(response.data);
    } catch (error) {
      toast.error('Failed to load lots');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCheck) {
        await axios.put(`/api/checks/${editingCheck.id}`, formData);
        toast.success('Quality check updated successfully');
      } else {
        await axios.post('/api/checks', formData);
        toast.success('Quality check created successfully');
      }
      setShowForm(false);
      setEditingCheck(null);
      resetForm();
      fetchChecks();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save quality check');
    }
  };

  const handleEdit = (check) => {
    setEditingCheck(check);
    setFormData({
      fk_lot_in: check.fk_lot_in || '',
      date: check.date || '',
      protocol: check.protocol || '',
      qt_controlled: check.qt_controlled || '',
      qt_non_compliant: check.qt_non_compliant || '',
      dim_calib: check.dim_calib || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (check) => {
    if (window.confirm(`Are you sure you want to delete protocol "${check.protocol}"?`)) {
      try {
        await axios.delete(`/api/checks/${check.id}`);
        toast.success('Quality check deleted successfully');
        fetchChecks();
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to delete quality check');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      fk_lot_in: '',
      date: '',
      protocol: '',
      qt_controlled: '',
      qt_non_compliant: '',
      dim_calib: ''
    });
  };

  const filteredChecks = checks.filter(check =>
    (check.protocol && check.protocol.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (check.lot_number && check.lot_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (check.supplier_name && check.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (check.food_name && check.food_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (check.date && check.date.includes(searchTerm))
  );

  if (loading) {
    return (
      <div className="checks-page">
        <div className="page-header">
          <h1 className="page-title">Quality Checks</h1>
          <p className="page-subtitle">Monitor incoming lot quality and compliance</p>
        </div>
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="checks-page">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h1 className="page-title">Quality Checks</h1>
            <p className="page-subtitle">Monitor incoming lot quality and compliance</p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => {
              setShowForm(true);
              setEditingCheck(null);
              resetForm();
            }}
          >
            <FaPlus /> Add Quality Check
          </button>
        </div>
      </div>

      <div className="search-bar">
        <div className="search-input-wrapper">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search checks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {showForm && (
        <div className="card">
          <h3>{editingCheck ? 'Edit Quality Check' : 'Add New Quality Check'}</h3>
          <form onSubmit={handleSubmit} className="checks-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Protocol Number *</label>
                <input
                  type="text"
                  value={formData.protocol}
                  onChange={(e) => setFormData({...formData, protocol: e.target.value})}
                  className="form-input"
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Lot *</label>
                <select
                  value={formData.fk_lot_in}
                  onChange={(e) => setFormData({...formData, fk_lot_in: e.target.value})}
                  className="form-input"
                  required
                >
                  <option value="">Select lot</option>
                  {lots.map(lot => (
                    <option key={lot.id} value={lot.id}>{lot.lot_number} ({lot.supplier_name}, {lot.food_name})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Controlled Quantity *</label>
                <input
                  type="number"
                  value={formData.qt_controlled}
                  onChange={(e) => setFormData({...formData, qt_controlled: e.target.value})}
                  className="form-input"
                  required
                  min="0"
                  step="any"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Non-compliant Quantity *</label>
                <input
                  type="number"
                  value={formData.qt_non_compliant}
                  onChange={(e) => setFormData({...formData, qt_non_compliant: e.target.value})}
                  className="form-input"
                  required
                  min="0"
                  step="any"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Dimension/Calibration *</label>
                <input
                  type="text"
                  value={formData.dim_calib}
                  onChange={(e) => setFormData({...formData, dim_calib: e.target.value})}
                  className="form-input"
                  required
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {editingCheck ? 'Update Quality Check' : 'Add Quality Check'}
              </button>
              <button 
                type="button" 
                className="btn btn-outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingCheck(null);
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
          <h3>Quality Checks ({filteredChecks.length})</h3>
        </div>
        {filteredChecks.length === 0 ? (
          <div className="empty-state">
            <p>No quality checks found. {searchTerm && 'Try adjusting your search.'}</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Protocol</th>
                  <th>Lot</th>
                  <th>Supplier</th>
                  <th>Food Item</th>
                  <th>Controlled Qty</th>
                  <th>Non-compliant Qty</th>
                  <th>Dimension/Calibration</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredChecks.map(check => (
                  <tr key={check.id}>
                    <td>{check.date}</td>
                    <td>{check.protocol}</td>
                    <td>{check.lot_number}</td>
                    <td>{check.supplier_name}</td>
                    <td>{check.food_name}</td>
                    <td>{check.qt_controlled}</td>
                    <td>{check.qt_non_compliant}</td>
                    <td>{check.dim_calib}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleEdit(check)}
                          title="Edit quality check"
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(check)}
                          title="Delete quality check"
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

export default Checks; 