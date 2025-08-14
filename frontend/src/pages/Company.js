import React, { useEffect, useState } from 'react';
import './Company.css';
import { API_ENDPOINTS } from '../config/api';

const API_BASE = API_ENDPOINTS.COMPANY;

const Company = () => {
  const [company, setCompany] = useState({
    name: '',
    vat: '',
    address: '',
    city: '',
    country: '',
    phone: '',
    email: '',
    website: '',
    logo: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch company info on mount
  useEffect(() => {
    const fetchCompany = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(API_BASE + '/details');
        if (!res.ok) throw new Error('Failed to fetch company info');
        const data = await res.json();
        setCompany({
          name: data.name || '',
          vat: data.vat || '',
          address: data.address || '',
          city: data.city || '',
          country: data.country || '',
          phone: data.phone || '',
          email: data.email || '',
          website: data.website || '',
          logo: data.logo || ''
        });
      } catch (err) {
        setError('Failed to load company information.');
      }
      setLoading(false);
    };
    fetchCompany();
  }, []);

  // Handle form changes
  const handleChange = (e) => {
    setCompany({ ...company, [e.target.name]: e.target.value });
  };

  // Handle save
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    // Validate required fields
    const required = ['name', 'vat', 'address', 'city', 'country', 'phone', 'email'];
    for (let field of required) {
      if (!company[field]) {
        setError('All fields are required.');
        setSaving(false);
        return;
      }
    }
    try {
      const res = await fetch(API_BASE + '/details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(company)
      });
      if (!res.ok) throw new Error('Failed to save company info');
      setSuccess('Company information saved successfully.');
    } catch (err) {
      setError('Failed to save company information.');
    }
    setSaving(false);
  };

  return (
    <div className="company-page">
      <div className="page-header">
        <h1 className="page-title">Company Settings</h1>
        <p className="page-subtitle">Configure system settings and company information</p>
      </div>
      <div className="company-card">
        <h3>Company Information</h3>
        {loading ? <p>Loading...</p> : (
          <form className="company-form" onSubmit={handleSave}>
            <div className="form-row">
              <label>Company Name *</label>
              <input name="name" value={company.name} onChange={handleChange} required />
            </div>
            <div className="form-row">
              <label>VAT *</label>
              <input name="vat" value={company.vat} onChange={handleChange} required />
            </div>
            <div className="form-row">
              <label>Address *</label>
              <input name="address" value={company.address} onChange={handleChange} required />
            </div>
            <div className="form-row">
              <label>City *</label>
              <input name="city" value={company.city} onChange={handleChange} required />
            </div>
            <div className="form-row">
              <label>Country *</label>
              <input name="country" value={company.country} onChange={handleChange} required />
            </div>
            <div className="form-row">
              <label>Phone *</label>
              <input name="phone" value={company.phone} onChange={handleChange} required />
            </div>
            <div className="form-row">
              <label>Email *</label>
              <input name="email" value={company.email} onChange={handleChange} required type="email" />
            </div>
            <div className="form-row">
              <label>Website</label>
              <input name="website" value={company.website} onChange={handleChange} />
            </div>
            <div className="form-row">
              <label>Logo</label>
              <input name="logo" value={company.logo} onChange={handleChange} />
            </div>
            {error && <div className="form-error">{error}</div>}
            {success && <div className="form-success">{success}</div>}
            <div className="form-actions">
              <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Company; 