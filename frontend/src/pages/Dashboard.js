import React, { useState, useEffect } from 'react';
import { FaTruck, FaUsers, FaBoxes, FaClipboardCheck, FaUtensils, FaShoppingCart, FaSearch } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Dashboard.css';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    suppliers: { totalSuppliers: 0, suppliersWithLots: 0 },
    customers: { totalCustomers: 0, customersWithSales: 0 },
    lotsIn: { totalLots: 0, expiredLots: 0 },
    checks: { totalChecks: 0, complianceRate: 0 },
    foods: { rawFoods: 0, processedFoods: 0 },
    sales: { total: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      
      // Fetch statistics from all endpoints
      const [
        suppliersRes,
        customersRes,
        lotsInRes,
        checksRes,
        foodsRes
      ] = await Promise.all([
        axios.get(buildApiUrl('suppliers/stats/summary')),
        axios.get(buildApiUrl('customers/stats/summary')),
        axios.get(buildApiUrl('lots-in/stats/summary')),
        axios.get(buildApiUrl('checks/stats/summary')),
        axios.get(buildApiUrl('foods/stats/summary'))
      ]);

      setStats({
        suppliers: suppliersRes.data,
        customers: customersRes.data,
        lotsIn: lotsInRes.data,
        checks: checksRes.data,
        foods: foodsRes.data,
        sales: { total: 0 } // TODO: Implement sales stats
      });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">System overview and key metrics</p>
        </div>
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">System overview and key metrics</p>
        </div>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">System overview and key metrics</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <FaTruck />
          </div>
          <div className="stat-content">
            <div className="stat-title">Suppliers</div>
            <div className="stat-value">{stats.suppliers.totalSuppliers}</div>
            <div className="stat-change">
              {stats.suppliers.suppliersWithLots} with lots
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <FaUsers />
          </div>
          <div className="stat-content">
            <div className="stat-title">Customers</div>
            <div className="stat-value">{stats.customers.totalCustomers}</div>
            <div className="stat-change">
              {stats.customers.customersWithSales} with sales
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <FaBoxes />
          </div>
          <div className="stat-content">
            <div className="stat-title">Incoming Lots</div>
            <div className="stat-value">{stats.lotsIn.totalLots}</div>
            <div className="stat-change">
              {stats.lotsIn.expiredLots} expired
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <FaClipboardCheck />
          </div>
          <div className="stat-content">
            <div className="stat-title">Quality Checks</div>
            <div className="stat-value">{stats.checks.totalChecks}</div>
            <div className="stat-change">
              {stats.checks.complianceRate}% compliance
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <FaUtensils />
          </div>
          <div className="stat-content">
            <div className="stat-title">Foods</div>
            <div className="stat-value">{stats.foods.rawFoods + stats.foods.processedFoods}</div>
            <div className="stat-change">
              {stats.foods.rawFoods} raw, {stats.foods.processedFoods} processed
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <FaShoppingCart />
          </div>
          <div className="stat-content">
            <div className="stat-title">Sales</div>
            <div className="stat-value">{stats.sales.total}</div>
            <div className="stat-change">
              Total transactions
            </div>
          </div>
        </div>
      </div>

      <div className="content-grid">
        <div className="card">
          <h3>Recent Activity</h3>
          <div className="activity-list">
            <div className="activity-item">
              <div className="activity-icon">
                <FaBoxes />
              </div>
              <div className="activity-content">
                <div className="activity-title">New incoming lot registered</div>
                <div className="activity-time">2 hours ago</div>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon">
                <FaClipboardCheck />
              </div>
              <div className="activity-content">
                <div className="activity-title">Quality check completed</div>
                <div className="activity-time">4 hours ago</div>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon">
                <FaUsers />
              </div>
              <div className="activity-content">
                <div className="activity-title">New customer added</div>
                <div className="activity-time">1 day ago</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Quick Actions</h3>
          <div className="quick-actions">
            <div className="quick-actions-row">
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/lots-in')}
              >
                <FaBoxes /> Register New Lot
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => navigate('/suppliers')}
              >
                <FaTruck /> Add Supplier
              </button>
            </div>
            <div className="quick-actions-row">
              <button 
                className="btn btn-outline"
                onClick={() => navigate('/customers')}
              >
                <FaUsers /> Add Customer
              </button>
              <button 
                className="btn btn-outline"
                onClick={() => navigate('/foods')}
              >
                <FaUtensils /> Manage Foods
              </button>
            </div>
            <div className="quick-actions-row">
              <button 
                className="btn btn-outline"
                onClick={() => navigate('/checks')}
              >
                <FaClipboardCheck /> Quality Checks
              </button>
              <button 
                className="btn btn-outline"
                onClick={() => navigate('/traceability')}
              >
                <FaSearch /> Run Traceability
              </button>
            </div>
            <div className="quick-actions-row">
              <button 
                className="btn btn-outline"
                onClick={() => navigate('/sales')}
              >
                <FaShoppingCart /> Sales
              </button>
              <button 
                className="btn btn-outline"
                onClick={() => navigate('/packages')}
              >
                <FaBoxes /> Packages
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 