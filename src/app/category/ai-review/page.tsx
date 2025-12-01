'use client';

import { useEffect, useState } from 'react';

type SuggestionItem = {
  supplier_product_id: string;
  supplier_sku?: string | null;
  product_name?: string | null;
  current_category_id?: string | null;
  current_category_name?: string | null;
  suggestion: null | {
    category_id: string;
    category_name: string;
    confidence: number;
    reasoning?: string;
    alternatives?: Array<{ category_id: string; confidence: number; reasoning?: string }>;
    provider?: string;
  };
  error?: string;
};

export default function AIReviewPage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<SuggestionItem[]>([]);
  const [limit, setLimit] = useState<number>(100);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/category/suggestions?uncategorized_only=true&limit=${limit}`, {
        method: 'GET',
      });
      const data = await res.json();
      if (data?.success) {
        setItems(data.suggestions || []);
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>AI Category Suggestions Review</h1>
      <div style={{ margin: '12px 0' }}>
        <label htmlFor="ai-review-limit" style={{ marginRight: 8 }}>
          Limit:
        </label>
        <input
          id="ai-review-limit"
          type="number"
          value={limit}
          onChange={e => setLimit(parseInt(e.target.value || '0', 10))}
          style={{ width: 100, marginRight: 12 }}
        />
        <button onClick={fetchSuggestions} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: 8 }}>
              Product
            </th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: 8 }}>
              Current Category
            </th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: 8 }}>
              Suggested Category
            </th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: 8 }}>
              Confidence
            </th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: 8 }}>
              Provider
            </th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: 8 }}>
              Reasoning
            </th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ padding: 16, color: '#666' }}>
                {loading ? 'Loading…' : 'No items'}
              </td>
            </tr>
          ) : (
            items.map(item => (
              <tr key={item.supplier_product_id}>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                  <div style={{ fontWeight: 600 }}>
                    {item.product_name || item.supplier_sku || item.supplier_product_id}
                  </div>
                  <div style={{ color: '#666', fontSize: 12 }}>{item.supplier_product_id}</div>
                </td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                  {item.current_category_name || '—'}
                </td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                  {item.suggestion?.category_name || (item.error ? 'Error' : '—')}
                </td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                  {item.suggestion ? item.suggestion.confidence.toFixed(2) : '—'}
                </td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                  {item.suggestion?.provider || '—'}
                </td>
                <td
                  style={{
                    borderBottom: '1px solid #eee',
                    padding: 8,
                    maxWidth: 480,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {item.suggestion?.reasoning || '—'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
