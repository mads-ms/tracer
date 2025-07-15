import React from 'react';
import { FaCog, FaBell, FaUser } from 'react-icons/fa';
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <div className="logo">
            <h1>HACCP Trace</h1>
            <span className="logo-subtitle">Food Traceability System</span>
          </div>
        </div>
        
        <div className="header-right">
          <div className="header-actions">
            <button className="header-btn" title="Notifications">
              <FaBell />
              <span className="notification-badge">3</span>
            </button>
            
            <button className="header-btn" title="Settings">
              <FaCog />
            </button>
            
            <button className="header-btn" title="User Profile">
              <FaUser />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 