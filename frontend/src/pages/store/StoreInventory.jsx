import React, { useState, useEffect } from 'react';
import { inventoryApi } from '../../api/inventory.api';
import { Card } from '../../components/common/Card';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { CheckCircle, AlertCircle, Package } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const StoreInventory = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'incoming'
  const [inventory, setInventory] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const storeManagerId = user?._id || user?.id;
      const [invRes, reqRes] = await Promise.all([
        inventoryApi.getStoreManagerInventory(storeManagerId),
        inventoryApi.getStockRequests({ storeManagerId, filterBySelf: true })
      ]);
      setInventory(invRes.data || []);
      setRequests(reqRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReceived = async (requestId) => {
    try {
      await inventoryApi.confirmStockReceived(requestId);
      alert('Stock marked as received and added to your inventory.');
      fetchData();
    } catch (err) {
      alert('Failed to confirm receipt: ' + err.message);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1.5rem' }}>Store Manager Inventory</h1>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <button 
          onClick={() => setActiveTab('inventory')}
          style={{ 
            padding: '0.75rem 1.5rem', 
            cursor: 'pointer', 
            borderRadius: 'var(--radius-md)', 
            border: 'none',
            background: activeTab === 'inventory' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'inventory' ? '#fff' : 'var(--text)',
            fontWeight: 600
          }}
        >
          My Inventory
        </button>
        <button 
          onClick={() => setActiveTab('incoming')}
          style={{ 
            padding: '0.75rem 1.5rem', 
            cursor: 'pointer', 
            borderRadius: 'var(--radius-md)', 
            border: 'none',
            background: activeTab === 'incoming' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'incoming' ? '#fff' : 'var(--text)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          Incoming Stock
          {requests.filter(r => r.status === 'SENT').length > 0 && (
            <span style={{ background: '#EF4444', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
              {requests.filter(r => r.status === 'SENT').length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'inventory' && (
        <Card title="Current Stock Levels">
          {inventory.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Your inventory is currently empty. Request stock from the Warehouse.
            </div>
          ) : (
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '1rem' }}>Item Code</th>
                  <th style={{ padding: '1rem' }}>Name</th>
                  <th style={{ padding: '1rem' }}>Category</th>
                  <th style={{ padding: '1rem' }}>Available Quantity</th>
                  <th style={{ padding: '1rem' }}>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map(item => (
                  <tr key={item._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{item.itemCode}</td>
                    <td style={{ padding: '1rem' }}>{item.itemName}</td>
                    <td style={{ padding: '1rem' }}>{item.category}</td>
                    <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--primary)' }}>
                      {item.quantity} {item.unit}
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                      {new Date(item.lastUpdated).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {activeTab === 'incoming' && (
        <Card title="Stock Requests & Incoming Items">
          {requests.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No stock requests found.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {requests.map(req => (
                <div key={req._id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.5rem', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Package size={20} /> Request on {new Date(req.requestedAt).toLocaleDateString()}
                      </h3>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Status updated: {req.resolvedAt ? new Date(req.resolvedAt).toLocaleString() : 'Pending'}
                      </div>
                    </div>
                    <span style={{ 
                      padding: '0.35rem 0.75rem', 
                      borderRadius: '999px', 
                      fontSize: '0.75rem', 
                      fontWeight: 700,
                      backgroundColor: req.status === 'REQUESTED' ? '#FEF3C7' : req.status === 'APPROVED' ? '#DBEAFE' : req.status === 'SENT' ? '#FEF08A' : req.status === 'RECEIVED' ? '#D1FAE5' : '#FEE2E2',
                      color: req.status === 'REQUESTED' ? '#B45309' : req.status === 'APPROVED' ? '#1E40AF' : req.status === 'SENT' ? '#854D0E' : req.status === 'RECEIVED' ? '#065F46' : '#991B1B'
                    }}>
                      {req.status}
                    </span>
                  </div>

                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.9rem', marginBottom: '1rem', background: '#fff' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                        <th style={{ padding: '0.75rem' }}>Item</th>
                        <th style={{ padding: '0.75rem' }}>Requested Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {req.items.map((it, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.75rem', fontWeight: 600 }}>{it.itemName} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({it.itemCode})</span></td>
                          <td style={{ padding: '0.75rem', fontWeight: 700 }}>{it.shortageQuantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {req.status === 'SENT' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                      <button 
                        onClick={() => handleConfirmReceived(req._id)}
                        style={{ 
                          padding: '0.75rem 1.5rem', 
                          background: '#10B981', 
                          color: '#fff', 
                          border: 'none', 
                          borderRadius: 'var(--radius-md)', 
                          fontWeight: 600, 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <CheckCircle size={18} /> Confirm Received
                      </button>
                    </div>
                  )}
                  {req.status === 'REQUESTED' && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={16} /> Waiting for Warehouse Manager to approve this request.
                    </div>
                  )}
                  {req.status === 'APPROVED' && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={16} /> Request approved. Waiting for goods to be sent from the warehouse.
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
