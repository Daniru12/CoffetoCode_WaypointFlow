import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { inventoryApi } from '../../api/inventory.api';
import { Card } from '../../components/common/Card';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ArrowLeft, Send, CheckCircle, PackageSearch } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const CATEGORIES = [
  'Food & Grocery',
  'Electrical & Electronics',
  'Clothing & Textiles',
  'Household & Cleaning',
  'Personal Care & Health'
];

export const CreateOrder = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState(null);

  const [activeTab, setActiveTab] = useState('new'); // 'new' or 'history'
  const [requestsHistory, setRequestsHistory] = useState([]);

  const [inventoryItems, setInventoryItems] = useState([]); // Master Catalog
  const [storeInventory, setStoreInventory] = useState([]); // Store Manager's actual stock

  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  
  // State to hold quantities requested by the user: { [itemCode]: requiredQuantity }
  const [requestedQuantities, setRequestedQuantities] = useState({});

  useEffect(() => {
    fetchInventory();
    fetchRequestsHistory();
  }, []);

  const fetchRequestsHistory = async () => {
    try {
      const res = await inventoryApi.getStockRequests({ 
        storeManagerId: user?._id || user?.id, 
        filterBySelf: 'true' 
      });
      if (res && res.success) {
        setRequestsHistory(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch request history', err);
    }
  };

  const fetchInventory = async () => {
    try {
      const [mainRes, storeRes] = await Promise.all([
        inventoryApi.getAll(),
        inventoryApi.getStoreManagerInventory(user?._id || user?.id)
      ]);
      setInventoryItems(mainRes.data || []);
      setStoreInventory(storeRes.data || []);
    } catch (error) {
      console.error('Failed to fetch inventory', error);
    } finally {
      setLoading(false);
    }
  };

  const itemsByCategory = useMemo(() => {
    const grouped = {};
    CATEGORIES.forEach(cat => grouped[cat] = []);
    inventoryItems.forEach(item => {
      const cat = (item.category || 'Food & Grocery').trim();
      // Try to find exact match in our defined categories, fallback to first category
      const matchedCat = CATEGORIES.find(c => c.toLowerCase() === cat.toLowerCase()) || 'Food & Grocery';
      grouped[matchedCat].push(item);
    });
    return grouped;
  }, [inventoryItems]);

  const handleQuantityChange = (itemCode, value) => {
    setRequestedQuantities(prev => ({
      ...prev,
      [itemCode]: Number(value)
    }));
  };

  const getShortages = () => {
    const shortages = [];
    Object.keys(requestedQuantities).forEach(itemCode => {
      const requiredQuantity = requestedQuantities[itemCode];
      if (requiredQuantity > 0) {
        const mainItem = inventoryItems.find(i => i.itemCode === itemCode);
        const storeItem = storeInventory.find(si => si.itemCode === itemCode);
        const availableQuantity = storeItem ? storeItem.quantity : 0;

        if (requiredQuantity > availableQuantity) {
          shortages.push({
            itemCode,
            itemName: mainItem ? mainItem.itemName : itemCode,
            requiredQuantity,
            availableQuantity,
            shortageQuantity: requiredQuantity - availableQuantity
          });
        }
      }
    });
    return shortages;
  };

  const shortages = getShortages();

  const handleSubmitRequest = async () => {
    if (shortages.length === 0) {
      alert('Please enter required quantities greater than your available stock for at least one item to generate a shortage request.');
      return;
    }

    setSubmitting(true);
    try {
      await inventoryApi.requestStock({ items: shortages, storeManagerId: user?._id || user?.id });
      setSuccessNotice('Stock request sent to Warehouse Manager successfully.');
      setRequestedQuantities({});
      fetchRequestsHistory(); // Refresh history
      fetchInventory(); // Refresh available stock just in case
    } catch (err) {
      console.error(err);
      alert('Failed to send stock request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading Inventory..." />;

  if (successNotice) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', marginTop: '2rem' }}>
        <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '2rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
          <CheckCircle size={48} style={{ color: '#059669', margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.5rem', margin: '0 0 1rem', fontWeight: 700 }}>Request Submitted</h2>
          <p style={{ fontSize: '1rem', marginBottom: '2rem', color: '#064E3B' }}>{successNotice}</p>
          <button className="btn-primary" onClick={() => setSuccessNotice(null)}>
            Make Another Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto', paddingBottom: '5rem' }}>
      <button onClick={() => navigate('/store/dashboard')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: 0 }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <PackageSearch size={32} style={{ color: 'var(--primary)' }} />
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
          Request Stock from Warehouse
        </h1>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', gap: '1rem' }}>
        <button 
          onClick={() => setActiveTab('new')}
          style={{ 
            padding: '0.75rem 1rem', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'new' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'new' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'new' ? 700 : 500,
            cursor: 'pointer'
          }}
        >
          New Stock Request
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          style={{ 
            padding: '0.75rem 1rem', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'history' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'history' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'history' ? 700 : 500,
            cursor: 'pointer'
          }}
        >
          My Request History
        </button>
      </div>

      {activeTab === 'new' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Browse the main warehouse catalog below. Enter the total quantity you require. The system will automatically calculate your shortage against your current Store Manager Inventory and send a request to the Warehouse Manager.
          </p>

          {/* INVENTORY CATALOG */}
          <Card title="MAIN INVENTORY CATALOG">
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1rem', overflowX: 'auto' }}>
            {CATEGORIES.map(cat => (
              <button 
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '0.75rem 1rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: `2px solid ${activeCategory === cat ? 'var(--primary)' : 'transparent'}`,
                  color: activeCategory === cat ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: activeCategory === cat ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
          
          <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {itemsByCategory[activeCategory]?.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                {itemsByCategory[activeCategory].map(item => {
                  const storeItem = storeInventory.find(si => si.itemCode === item.itemCode);
                  const availableQty = storeItem ? storeItem.quantity : 0;
                  const reqQty = requestedQuantities[item.itemCode] || 0;
                  const isShortage = reqQty > availableQty;
                  
                  return (
                    <div key={item._id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: isShortage ? '#FEF2F2' : '#FFF' }}>
                      <div style={{ flex: 1, minWidth: '150px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{item.itemName}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          Code: {item.itemCode} • Category: {item.category}
                        </div>
                      </div>
                      
                      <div style={{ textAlign: 'center', padding: '0 1rem', borderRight: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Warehouse Stock</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0284C7' }}>
                          {item.quantity} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{item.unit}</span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'center', padding: '0 1rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>My Stock</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: availableQty > 0 ? '#059669' : '#64748B' }}>
                          {availableQty} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{item.unit}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#F8FAFC', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Required:</label>
                        <input 
                          type="number" 
                          min="0"
                          placeholder="0"
                          className="input-field" 
                          value={requestedQuantities[item.itemCode] || ''} 
                          onChange={(e) => handleQuantityChange(item.itemCode, e.target.value)}
                          style={{ width: '80px', padding: '0.5rem', textAlign: 'center', fontWeight: 600 }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No inventory items found in this category.
              </div>
            )}
          </div>
        </Card>

        {/* SHORTAGES SUMMARY */}
        {shortages.length > 0 && (
          <Card style={{ background: '#FFF', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Calculated Shortages Summary
            </h3>
            
            <div style={{ background: '#F8FAFC', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid #E2E8F0', marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.5rem', padding: '0.75rem', background: '#F1F5F9', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                <div>Item Name</div>
                <div style={{ textAlign: 'center' }}>Required Qty</div>
                <div style={{ textAlign: 'center' }}>Available Qty</div>
                <div style={{ textAlign: 'center', color: '#B91C1C' }}>Shortage Qty</div>
              </div>
              {shortages.map((shortage, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.5rem', padding: '0.75rem', borderTop: idx > 0 ? '1px solid #E2E8F0' : 'none', fontSize: '0.9rem', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600 }}>{shortage.itemName} <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block' }}>{shortage.itemCode}</span></div>
                  <div style={{ textAlign: 'center', fontWeight: 600 }}>{shortage.requiredQuantity}</div>
                  <div style={{ textAlign: 'center', color: '#64748B' }}>{shortage.availableQuantity}</div>
                  <div style={{ textAlign: 'center', fontWeight: 800, color: '#DC2626' }}>{shortage.shortageQuantity}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                onClick={handleSubmitRequest} 
                disabled={submitting} 
                className="btn-primary" 
                style={{ background: '#B91C1C', borderColor: '#B91C1C', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}
              >
                <Send size={18} /> {submitting ? 'Sending Request...' : 'Send Stock Request to Warehouse'}
              </button>
            </div>
          </Card>
        )}

        </div>
      )}

      {activeTab === 'history' && (
        <Card title="My Stock Request History">
          {requestsHistory.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              You have not submitted any stock requests yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {requestsHistory.map(req => (
                <div key={req._id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem', backgroundColor: '#F8FAFC' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h4 style={{ margin: '0 0 0.25rem 0' }}>Request #{req._id.slice(-6).toUpperCase()}</h4>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Date: {new Date(req.requestedAt).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span style={{ 
                        padding: '0.35rem 0.75rem', 
                        borderRadius: '999px', 
                        fontSize: '0.75rem', 
                        fontWeight: 700,
                        backgroundColor: req.status === 'PENDING' ? '#FEF3C7' : req.status === 'APPROVED' ? '#D1FAE5' : '#FEE2E2',
                        color: req.status === 'PENDING' ? '#B45309' : req.status === 'APPROVED' ? '#065F46' : '#991B1B'
                      }}>
                        {req.status}
                      </span>
                    </div>
                  </div>

                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#E2E8F0' }}>
                        <th style={{ padding: '0.5rem' }}>Item</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center' }}>Requested Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {req.items.map((it, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '0.5rem', fontWeight: 600 }}>{it.itemName}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'center' }}>{it.shortageQuantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

    </div>
  );
};
