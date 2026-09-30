import React from 'react';

export const Table = ({ columns = [], data = [], keyField = '_id', emptyMessage = 'No records found' }) => {
  if (data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
            {columns.map((col, idx) => (
              <th
                key={idx}
                style={{
                  padding: '0.75rem 0.5rem',
                  textAlign: col.align || 'left',
                  width: col.width || 'auto'
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr key={row[keyField] || rowIdx} style={{ borderBottom: '1px solid #F1F5F9' }}>
              {columns.map((col, colIdx) => (
                <td
                  key={colIdx}
                  style={{
                    padding: '0.85rem 0.5rem',
                    textAlign: col.align || 'left'
                  }}
                >
                  {col.render ? col.render(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
