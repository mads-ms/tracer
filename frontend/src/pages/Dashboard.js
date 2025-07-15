import React, { useState, useEffect } from 'react';
import { FaTruck, FaUsers, FaBoxes, FaClipboardCheck, FaUtensils, FaShoppingCart } from 'react-icons/fa';
import axios from 'axios';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState({
    suppliers: { total: 0, withLots: 0 },
    customers: { total: 0, withSales: 0 },
    lotsIn: { total: 0, totalQuantity: 0, remainingQuantity: 0, expired: 0 },
    checks: { total: 0, complianceRate: 100 },
    foods: { raw: 0, processed: 0 },
    sales: { total: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        axios.get('/api/suppliers/stats/summary'),
        axios.get('/api/customers/stats/summary'),
        axios.get('/api/lots-in/stats/summary'),
        axios.get('/api/checks/stats/summary'),
        axios.get('/api/foods/stats/summary')
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
            <button className="btn btn-primary">Register New Lot</button>
            <button className="btn btn-secondary">Add Supplier</button>
            <button className="btn btn-outline">Create Food Recipe</button>
            <button className="btn btn-outline">Run Traceability</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 