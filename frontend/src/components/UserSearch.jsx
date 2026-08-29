import { useState, useEffect } from 'react';
import { api } from '../services/api';

export function UserSearch({ onSelect, excludeId, placeholder = 'Search by name, email, or phone' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let timeout;
    if (query.length >= 2) {
      timeout = setTimeout(async () => {
        setLoading(true);
        try {
          const { users } = await api.users.search(query);
          setResults(users.filter(u => u.id !== excludeId));
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      }, 300);
    } else {
      setResults([]);
    }
    return () => clearTimeout(timeout);
  }, [query, excludeId]);

  const handleSelect = (user) => {
    onSelect(user);
    setQuery('');
    setResults([]);
    setShow(false);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setShow(true); }}
        onFocus={() => setShow(true)}
        onBlur={() => setTimeout(() => setShow(false), 200)}
        placeholder={placeholder}
        className="input"
      />
      {show && results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {loading && <div className="p-4 text-center text-gray-500">Searching...</div>}
          {results.map(user => (
            <button
              key={user.id}
              onClick={() => handleSelect(user)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-0"
            >
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-gray-500">{user.email} · {user.phone}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}export default UserSearch;
