import React, { useState, useEffect } from 'react';
import { inventoryApi } from '../../api/inventory.api';
import {
  UploadCloud, AlertTriangle, CheckCircle, Package, Send
} from 'lucide-react';

export const Inventory = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'load', 'report'

  // Load state
  const [loadItems, setLoadItems] = useState([{ itemCode: '', quantity: 1 }]);
  const [outletId, setOutletId] = useState('');
  
  const [requests, setRequests] = useState([]);
  
  // Issue state
  const [issue, setIssue] = useState({ type: 'MISSING_GOODS', description: '', quantity: 1, itemCode: '' });

  useEffect(() => {
    fetchInventory();
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await inventoryApi.getStockRequests();
      if (res && res.success) {
        setRequests(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await inventoryApi.getAll();
      if (res && res.success) {
        setItems(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      await inventoryApi.uploadCsv(formData);
      setMessage('CSV Uploaded Successfully');
      setFile(null);
      fetchInventory();
    } catch (err) {
      setMessage('Upload Failed');
    }
  };

  const handleLoadSubmit = async (e) => {
    e.preventDefault();
    try {
      await inventoryApi.loadGoods({ items: loadItems, outletId });
      setMessage('Goods Loaded & Deducted Successfully');
      fetchInventory();
      setLoadItems([{ itemCode: '', quantity: 1 }]);
      setOutletId('');
    } catch (err) {
      setMessage('Failed to Load Goods: ' + err.message);
    }
  };

  const handleApproveRequest = async (requestId) => {
    try {
      await inventoryApi.approveStockRequest(requestId);
      setMessage('Stock request approved');
      fetchRequests();
    } catch (err) {
      setMessage('Failed to approve request: ' + err.message);
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await inventoryApi.rejectStockRequest(requestId);
      setMessage('Stock request rejected');
      fetchRequests();
    } catch (err) {
      setMessage('Failed to reject request: ' + err.message);
    }
  };

  const handleMarkSent = async (requestId) => {
    try {
      await inventoryApi.markStockRequestSent(requestId);
      setMessage('Stock marked as sent and main inventory deducted');
      fetchRequests();
      fetchInventory(); // Refresh main inventory as it was deducted
    } catch (err) {
      setMessage('Failed to mark sent: ' + err.message);
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    try {
      await inventoryApi.reportIssue(issue);
      setMessage('Issue Reported Successfully');
      setIssue({ type: 'MISSING_GOODS', description: '', quantity: 1, itemCode: '' });
    } catch (err) {
      setMessage('Failed to report issue');
    }
  };

  const styles = {
    container: { padding: '2rem' },
    card: { backgroundColor: 'var(--card-bg)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
    tabs: { display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' },
    tab: (active) => ({
      padding: '0.75rem 1.5rem', cursor: 'pointer', borderRadius: 'var(--radius-md)',
      backgroundColor: active ? '#059669' : 'transparent',
      color: active ? '#ffffff' : 'inherit', fontWeight: '600',
      transition: 'all 0.2s'
    }),
    input: { width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1rem', backgroundColor: 'var(--bg-color)' },
    btn: { padding: '0.75rem 1.5rem', backgroundColor: '#059669', color: '#ffffff', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }
  };

  const pendingRequestsCount = requests.filter(r => r.status === 'REQUESTED').length;

  return (
    <div style={styles.container}>
      <h2>Warehouse Inventory Management</h2>
      {message && <div style={{ padding: '1rem', backgroundColor: 'var(--bg-color)', marginBottom: '1rem', borderRadius: 'var(--radius-md)' }}>{message}</div>}
      
      <div style={styles.tabs}>
        <div style={styles.tab(activeTab === 'list')} onClick={() => setActiveTab('list')}>Inventory List & CSV</div>
        <div style={styles.tab(activeTab === 'requests')} onClick={() => setActiveTab('requests')}>
          Store Stock Requests
          {pendingRequestsCount > 0 && (
            <span style={{ marginLeft: '8px', background: '#DC2626', color: '#FFF', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
              {pendingRequestsCount}
            </span>
          )}
        </div>
        <div style={styles.tab(activeTab === 'load')} onClick={() => setActiveTab('load')}>Load Goods</div>
        <div style={styles.tab(activeTab === 'report')} onClick={() => setActiveTab('report')}>Report Issue</div>
      </div>

      {activeTab === 'list' && (
        <div style={styles.card}>
          <h3>Upload Inventory CSV</h3>
          <form onSubmit={handleFileUpload} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} style={styles.input} />
            <button type="submit" style={styles.btn}><UploadCloud size={20} /> Update Stock</button>
          </form>

          <h3>Current Inventory</h3>
          {loading ? <p>Loading...</p> : (
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.5rem' }}>Code</th>
                  <th style={{ padding: '0.5rem' }}>Name</th>
                  <th style={{ padding: '0.5rem' }}>Category</th>
                  <th style={{ padding: '0.5rem' }}>Quantity</th>
                  <th style={{ padding: '0.5rem' }}>Additional Info</th>
                </tr>
              </thead>
              <tbody>
                {items.map(it => (
                  <tr key={it._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.5rem' }}>{it.itemCode}</td>
                    <td style={{ padding: '0.5rem' }}>{it.itemName}</td>
                    <td style={{ padding: '0.5rem' }}>{it.category}</td>
                    <td style={{ padding: '0.5rem' }}>{it.quantity} {it.unit}</td>
                    <td style={{ padding: '0.5rem' }}>
                      {it.extraData ? Object.entries(it.extraData).map(([k, v]) => (
                        <div key={k} style={{ fontSize: '0.8rem' }}><span style={{ color: 'var(--text-secondary)' }}>{k}:</span> {v}</div>
                      )) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'requests' && (
        <div style={styles.card}>
          <h3>Store Manager Stock Requests</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Review and approve stock shortages requested by Store Managers. Approving a request will automatically deduct the stock from the Main Inventory and add it to the Store Manager's Inventory.
          </p>

          {requests.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No stock requests found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {requests.map(req => (
                <div key={req._id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', backgroundColor: '#FFF' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h4 style={{ margin: '0 0 0.25rem 0' }}>Request from Store Manager</h4>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Requested At: {new Date(req.requestedAt).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span style={{ 
                        padding: '0.35rem 0.75rem', 
                        borderRadius: '999px', 
                        fontSize: '0.75rem', 
                        fontWeight: 700,
                        backgroundColor: req.status === 'REQUESTED' ? '#FEF3C7' : req.status === 'APPROVED' ? '#DBEAFE' : req.status === 'SENT' ? '#D1FAE5' : req.status === 'RECEIVED' ? '#10B981' : '#FEE2E2',
                        color: req.status === 'REQUESTED' ? '#B45309' : req.status === 'APPROVED' ? '#1E40AF' : req.status === 'SENT' ? '#065F46' : req.status === 'RECEIVED' ? '#FFF' : '#991B1B'
                      }}>
                        {req.status}
                      </span>
                    </div>
                  </div>

                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-color)' }}>
                        <th style={{ padding: '0.5rem' }}>Item</th>
                        <th style={{ padding: '0.5rem' }}>Required</th>
                        <th style={{ padding: '0.5rem' }}>Their Stock</th>
                        <th style={{ padding: '0.5rem', color: '#DC2626' }}>Shortage (To Issue)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {req.items.map((it, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.5rem', fontWeight: 600 }}>{it.itemName} <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{it.itemCode}</div></td>
                          <td style={{ padding: '0.5rem' }}>{it.requiredQuantity}</td>
                          <td style={{ padding: '0.5rem' }}>{it.availableQuantity}</td>
                          <td style={{ padding: '0.5rem', fontWeight: 700, color: '#DC2626' }}>{it.shortageQuantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {req.status === 'REQUESTED' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                      <button 
                        onClick={() => handleRejectRequest(req._id)}
                        style={{ ...styles.btn, backgroundColor: '#DC2626' }}
                      >
                        Reject
                      </button>
                      <button 
                        onClick={() => handleApproveRequest(req._id)}
                        style={{ ...styles.btn, backgroundColor: '#0284C7' }}
                      >
                        <CheckCircle size={16} /> Approve
                      </button>
                    </div>
                  )}

                  {req.status === 'APPROVED' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => handleMarkSent(req._id)}
                        style={{ ...styles.btn, backgroundColor: '#059669' }}
                      >
                        <Send size={16} /> Mark as Sent (Deduct Main Stock)
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'load' && (
        <div style={styles.card}>
          <h3>Load Goods to Outlet</h3>
          <form onSubmit={handleLoadSubmit}>
            <input placeholder="Outlet ID" value={outletId} onChange={e => setOutletId(e.target.value)} style={styles.input} required />
            {loadItems.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '1rem' }}>
                <input placeholder="Item Code" value={item.itemCode} onChange={e => {
                  const newItems = [...loadItems];
                  newItems[idx].itemCode = e.target.value;
                  setLoadItems(newItems);
                }} style={styles.input} required />
                <input type="number" placeholder="Quantity" value={item.quantity} onChange={e => {
                  const newItems = [...loadItems];
                  newItems[idx].quantity = parseInt(e.target.value);
                  setLoadItems(newItems);
                }} style={styles.input} required min="1" />
              </div>
            ))}
            <button type="button" onClick={() => setLoadItems([...loadItems, { itemCode: '', quantity: 1 }])} style={{ ...styles.btn, backgroundColor: 'var(--text-secondary)', marginBottom: '1rem' }}>+ Add Item</button>
            <button type="submit" style={styles.btn}><Package size={20} /> Process Loading</button>
          </form>
        </div>
      )}

      {activeTab === 'report' && (
        <div style={styles.card}>
          <h3>Report Missing or Damaged Goods</h3>
          <form onSubmit={handleReportSubmit}>
            <select value={issue.type} onChange={e => setIssue({...issue, type: e.target.value})} style={styles.input}>
              <option value="MISSING_GOODS">Missing Goods</option>
              <option value="DAMAGED_GOODS">Damaged Goods</option>
            </select>
            <input placeholder="Item Code (optional)" value={issue.itemCode} onChange={e => setIssue({...issue, itemCode: e.target.value})} style={styles.input} />
            <input type="number" placeholder="Quantity" value={issue.quantity} onChange={e => setIssue({...issue, quantity: parseInt(e.target.value)})} style={styles.input} required min="1" />
            <textarea placeholder="Description" value={issue.description} onChange={e => setIssue({...issue, description: e.target.value})} style={{ ...styles.input, minHeight: '100px' }} required />
            <button type="submit" style={styles.btn}><AlertTriangle size={20} /> Submit Report</button>
          </form>
        </div>
      )}
    </div>
  );
};
