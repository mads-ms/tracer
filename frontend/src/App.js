import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Components
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Suppliers from './pages/Suppliers';
import Customers from './pages/Customers';
import LotsIn from './pages/LotsIn';
import LotsOut from './pages/LotsOut';
import Checks from './pages/Checks';
import Foods from './pages/Foods';
import Packages from './pages/Packages';
import Sales from './pages/Sales';
import Traceability from './pages/Traceability';
import Barcodes from './pages/Barcodes';
import Company from './pages/Company';

// Styles
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Header />
        <div className="app-content">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/lots-in" element={<LotsIn />} />
              <Route path="/lots-out" element={<LotsOut />} />
              <Route path="/checks" element={<Checks />} />
              <Route path="/foods" element={<Foods />} />
              <Route path="/packages" element={<Packages />} />
              <Route path="/sales" element={<Sales />} />
              <Route path="/traceability" element={<Traceability />} />
              <Route path="/barcodes" element={<Barcodes />} />
              <Route path="/company" element={<Company />} />
            </Routes>
          </main>
        </div>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </div>
    </Router>
  );
}

export default App; 