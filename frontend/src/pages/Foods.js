import React, { useEffect, useState } from 'react';
import './Dashboard.css';
import './Foods.css';
import { API_ENDPOINTS } from '../config/api';

const API_BASE = API_ENDPOINTS.FOODS;

const Foods = () => {
  // State
  const [foods, setFoods] = useState([]);
  const [rawFoods, setRawFoods] = useState([]);
  const [processedFoods, setProcessedFoods] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showRawModal, setShowRawModal] = useState(false);
  const [showProcessedModal, setShowProcessedModal] = useState(false);
  const [editRaw, setEditRaw] = useState(null);
  const [editProcessed, setEditProcessed] = useState(null);
  const [units, setUnits] = useState([]);
  const [gtins, setGtins] = useState([]);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [recipeFood, setRecipeFood] = useState(null);
  const [recipe, setRecipe] = useState([]);
  const [lotsIn, setLotsIn] = useState([]);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeError, setRecipeError] = useState(null);

  // Fetch foods
  const fetchFoods = async (query = '') => {
    setLoading(true);
    setError(null);
    try {
      let url = API_BASE + (query ? `/search/${encodeURIComponent(query)}` : '/');
      const res = await fetch(url);
      const data = await res.json();
      setRawFoods(data.raw || []);
      setProcessedFoods(data.processed || []);
      setFoods(data.all || []);
    } catch (err) {
      setError('Failed to fetch foods');
    }
    setLoading(false);
  };

  // Fetch units and GTINs
  const fetchUnitsAndGtins = async () => {
    try {
      const [unitsRes, gtinsRes] = await Promise.all([
        fetch(API_BASE + '/units'),
        fetch(API_BASE + '/gtin'),
      ]);
      setUnits(await unitsRes.json());
      setGtins(await gtinsRes.json());
    } catch {}
  };

  useEffect(() => {
    fetchFoods();
    fetchUnitsAndGtins();
  }, []);

  // Search handler
  const handleSearch = (e) => {
    setSearch(e.target.value);
    fetchFoods(e.target.value);
  };

  // Tab handler
  const handleTab = (tab) => setActiveTab(tab);

  // CRUD handlers for raw foods
  const handleAddRaw = () => {
    setEditRaw({ name: '', unit_measure: '', source: '', expiry_date: '', gtin_number: '' });
    setShowRawModal(true);
  };
  const handleEditRaw = (food) => {
    setEditRaw(food);
    setShowRawModal(true);
  };
  const handleDeleteRaw = async (id) => {
    if (!window.confirm('Delete this raw food?')) return;
    try {
      await fetch(`${API_BASE}/raw/${id}`, { method: 'DELETE' });
      fetchFoods(search);
    } catch {}
  };

  // CRUD handlers for processed foods
  const handleAddProcessed = () => {
    setEditProcessed({ name: '', unit_measure: '', fk_gtin: '' });
    setShowProcessedModal(true);
  };
  const handleEditProcessed = (food) => {
    setEditProcessed(food);
    setShowProcessedModal(true);
  };
  const handleDeleteProcessed = async (id) => {
    if (!window.confirm('Delete this processed food?')) return;
    try {
      await fetch(`${API_BASE}/processed/${id}`, { method: 'DELETE' });
      fetchFoods(search);
    } catch {}
  };

  // Recipe management
  const handleShowRecipe = async (food) => {
    setRecipeFood(food);
    setShowRecipeModal(true);
    setRecipeLoading(true);
    setRecipeError(null);
    try {
      const res = await fetch(`${API_BASE}/processed/${food.id}/composition`);
      setRecipe(await res.json());
    } catch {
      setRecipeError('Failed to fetch recipe');
    }
    setRecipeLoading(false);
    // Fetch all lotsIn for ingredient selection
    try {
      const lotsRes = await fetch(API_ENDPOINTS.LOTS_IN);
      setLotsIn(await lotsRes.json());
    } catch {}
  };

  const handleAddIngredient = async (lotId, quantity) => {
    try {
      await fetch(`${API_BASE}/processed/${recipeFood.id}/composition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fk_lot_in: lotId, quantity }),
      });
      handleShowRecipe(recipeFood);
    } catch {}
  };
  const handleUpdateIngredient = async (lotId, quantity) => {
    try {
      await fetch(`${API_BASE}/processed/${recipeFood.id}/composition/${lotId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      });
      handleShowRecipe(recipeFood);
    } catch {}
  };
  const handleRemoveIngredient = async (lotId) => {
    if (!window.confirm('Remove this ingredient from recipe?')) return;
    try {
      await fetch(`${API_BASE}/processed/${recipeFood.id}/composition/${lotId}`, { method: 'DELETE' });
      handleShowRecipe(recipeFood);
    } catch {}
  };

  // Modal forms for raw and processed foods
  const RawFoodModal = () => {
    const [form, setForm] = useState(editRaw);
    const [saving, setSaving] = useState(false);
    const isEdit = !!editRaw?.id;
    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
    const handleSubmit = async (e) => {
      e.preventDefault();
      setSaving(true);
      try {
        const method = isEdit ? 'PUT' : 'POST';
        const url = isEdit ? `${API_BASE}/raw/${editRaw.id}` : `${API_BASE}/raw`;
        await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        setShowRawModal(false);
        fetchFoods(search);
      } catch {}
      setSaving(false);
    };
    return (
      <div className="modal-overlay">
        <div className="modal">
          <h2>{isEdit ? 'Edit Raw Food' : 'Add Raw Food'}</h2>
          <form onSubmit={handleSubmit}>
            <input name="name" value={form.name} onChange={handleChange} placeholder="Name" required />
            <select name="unit_measure" value={form.unit_measure} onChange={handleChange} required>
              <option value="">Unit</option>
              {units.map(u => <option key={u.symbol} value={u.symbol}>{u.name} ({u.symbol})</option>)}
            </select>
            <input name="source" value={form.source} onChange={handleChange} placeholder="Source" required />
            <input name="expiry_date" value={form.expiry_date} onChange={handleChange} placeholder="Expiry Date" type="date" required />
            <input name="gtin_number" value={form.gtin_number || ''} onChange={handleChange} placeholder="GTIN (optional)" />
            <div className="modal-actions">
              <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              <button type="button" onClick={() => setShowRawModal(false)}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const ProcessedFoodModal = () => {
    const [form, setForm] = useState(editProcessed);
    const [saving, setSaving] = useState(false);
    const isEdit = !!editProcessed?.id;
    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
    const handleSubmit = async (e) => {
      e.preventDefault();
      setSaving(true);
      try {
        const method = isEdit ? 'PUT' : 'POST';
        const url = isEdit ? `${API_BASE}/processed/${editProcessed.id}` : `${API_BASE}/processed`;
        await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        setShowProcessedModal(false);
        fetchFoods(search);
      } catch {}
      setSaving(false);
    };
    return (
      <div className="modal-overlay">
        <div className="modal">
          <h2>{isEdit ? 'Edit Processed Food' : 'Add Processed Food'}</h2>
          <form onSubmit={handleSubmit}>
            <input name="name" value={form.name} onChange={handleChange} placeholder="Name" required />
            <select name="unit_measure" value={form.unit_measure} onChange={handleChange} required>
              <option value="">Unit</option>
              {units.map(u => <option key={u.symbol} value={u.symbol}>{u.name} ({u.symbol})</option>)}
            </select>
            <select name="fk_gtin" value={form.fk_gtin} onChange={handleChange} required>
              <option value="">GTIN</option>
              {gtins.map(g => <option key={g.id} value={g.id}>{g.code}</option>)}
            </select>
            <div className="modal-actions">
              <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              <button type="button" onClick={() => setShowProcessedModal(false)}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Recipe management modal
  const RecipeModal = () => {
    const [lotId, setLotId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [adding, setAdding] = useState(false);
    return (
      <div className="modal-overlay">
        <div className="modal large">
          <h2>Recipe for: {recipeFood?.name}</h2>
          {recipeLoading ? <p>Loading...</p> : recipeError ? <p className="error">{recipeError}</p> : (
            <>
              <table className="foods-table">
                <thead>
                  <tr>
                    <th>Ingredient Lot</th>
                    <th>Raw Food</th>
                    <th>Source</th>
                    <th>Unit</th>
                    <th>Expiry</th>
                    <th>Quantity</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recipe.map(ing => (
                    <tr key={ing.fk_lot_in}>
                      <td>{ing.lot_number}</td>
                      <td>{ing.food_in_name}</td>
                      <td>{ing.food_in_source}</td>
                      <td>{ing.food_in_unit}</td>
                      <td>{ing.food_in_expiry}</td>
                      <td>
                        <input
                          type="number"
                          value={ing.quantity}
                          min="0"
                          step="any"
                          onChange={e => handleUpdateIngredient(ing.fk_lot_in, e.target.value)}
                        />
                      </td>
                      <td>
                        <button onClick={() => handleRemoveIngredient(ing.fk_lot_in)}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="add-ingredient">
                <h4>Add Ingredient Lot</h4>
                <select value={lotId} onChange={e => setLotId(e.target.value)}>
                  <option value="">Select Lot</option>
                  {lotsIn.map(lot => (
                    <option key={lot.id} value={lot.id}>
                      {lot.lot_number} - {lot.food_name} ({lot.acceptance_date})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={quantity}
                  min="0"
                  step="any"
                  onChange={e => setQuantity(e.target.value)}
                  placeholder="Quantity"
                />
                <button
                  onClick={async () => {
                    setAdding(true);
                    await handleAddIngredient(lotId, quantity);
                    setLotId('');
                    setQuantity('');
                    setAdding(false);
                  }}
                  disabled={!lotId || !quantity || adding}
                >
                  {adding ? 'Adding...' : 'Add'}
                </button>
              </div>
            </>
          )}
          <div className="modal-actions">
            <button type="button" onClick={() => setShowRecipeModal(false)}>Close</button>
          </div>
        </div>
      </div>
    );
  };

  // Table data
  const foodsToShow = activeTab === 'all' ? foods : activeTab === 'raw' ? rawFoods : processedFoods;

  return (
    <div className="foods-page">
      <div className="page-header">
        <h1 className="page-title">Foods</h1>
        <p className="page-subtitle">Manage raw materials and food recipes</p>
      </div>
      <div className="foods-controls">
        <input
          type="text"
          placeholder="Search foods..."
          value={search}
          onChange={handleSearch}
        />
        <div className="foods-tabs">
          <button className={activeTab === 'all' ? 'active' : ''} onClick={() => handleTab('all')}>All</button>
          <button className={activeTab === 'raw' ? 'active' : ''} onClick={() => handleTab('raw')}>Raw</button>
          <button className={activeTab === 'processed' ? 'active' : ''} onClick={() => handleTab('processed')}>Processed</button>
        </div>
        <div className="foods-actions">
          <button onClick={handleAddRaw}>Add Raw Food</button>
          <button onClick={handleAddProcessed}>Add Processed Food</button>
        </div>
      </div>
      {loading ? <p>Loading...</p> : error ? <p className="error">{error}</p> : (
        <table className="foods-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Unit</th>
              <th>Source</th>
              <th>Expiry</th>
              <th>GTIN</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {foodsToShow.map(food => (
              <tr key={food.id}>
                <td>{food.name}</td>
                <td>{food.type || (food.source ? 'raw' : 'processed')}</td>
                <td>{food.unit_measure}</td>
                <td>{food.source || '-'}</td>
                <td>{food.expiry_date || '-'}</td>
                <td>{food.gtin_code || food.gtin_number || '-'}</td>
                <td>
                  {food.type === 'raw' || food.source ? (
                    <>
                      <button onClick={() => handleEditRaw(food)}>Edit</button>
                      <button onClick={() => handleDeleteRaw(food.id)}>Delete</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEditProcessed(food)}>Edit</button>
                      <button onClick={() => handleDeleteProcessed(food.id)}>Delete</button>
                      <button onClick={() => handleShowRecipe(food)}>Recipe</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {showRawModal && <RawFoodModal />}
      {showProcessedModal && <ProcessedFoodModal />}
      {showRecipeModal && <RecipeModal />}
    </div>
  );
};

export default Foods; 