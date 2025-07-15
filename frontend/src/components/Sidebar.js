import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  FaTachometerAlt, 
  FaTruck, 
  FaUsers, 
  FaBoxes, 
  FaClipboardCheck,
  FaUtensils,
  FaBox,
  FaShoppingCart,
  FaSearch,
  FaBarcode,
  FaCog
} from 'react-icons/fa';
import './Sidebar.css';

const Sidebar = () => {
  const menuItems = [
    {
      path: '/',
      icon: <FaTachometerAlt />,
      label: 'Dashboard',
      description: 'System overview'
    },
    {
      path: '/suppliers',
      icon: <FaTruck />,
      label: 'Suppliers',
      description: 'Manage suppliers'
    },
    {
      path: '/customers',
      icon: <FaUsers />,
      label: 'Customers',
      description: 'Manage customers'
    },
    {
      path: '/lots-in',
      icon: <FaBoxes />,
      label: 'Incoming Lots',
      description: 'Register incoming lots'
    },
    {
      path: '/checks',
      icon: <FaClipboardCheck />,
      label: 'Quality Checks',
      description: 'Incoming lot checks'
    },
    {
      path: '/foods',
      icon: <FaUtensils />,
      label: 'Foods',
      description: 'Raw materials & recipes'
    },
    {
      path: '/lots-out',
      icon: <FaBox />,
      label: 'Outgoing Lots',
      description: 'Manage outgoing lots'
    },
    {
      path: '/packages',
      icon: <FaBox />,
      label: 'Packages',
      description: 'Package management'
    },
    {
      path: '/sales',
      icon: <FaShoppingCart />,
      label: 'Sales',
      description: 'Sales management'
    },
    {
      path: '/traceability',
      icon: <FaSearch />,
      label: 'Traceability',
      description: 'Full traceability system'
    },
    {
      path: '/barcodes',
      icon: <FaBarcode />,
      label: 'Barcodes',
      description: 'GTIN management'
    },
    {
      path: '/company',
      icon: <FaCog />,
      label: 'Company Settings',
      description: 'System configuration'
    }
  ];

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {menuItems.map((item, index) => (
            <li key={index} className="nav-item">
              <NavLink
                to={item.path}
                className={({ isActive }) => 
                  `nav-link ${isActive ? 'active' : ''}`
                }
                end={item.path === '/'}
              >
                <div className="nav-icon">
                  {item.icon}
                </div>
                <div className="nav-content">
                  <span className="nav-label">{item.label}</span>
                  <span className="nav-description">{item.description}</span>
                </div>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar; 