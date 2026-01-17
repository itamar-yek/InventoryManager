/**
 * Search Page
 *
 * Global search for items by name and catalog numbers.
 * Requires Editor or Admin role to access.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useInventoryStore } from '../stores/inventoryStore';
import { useAuthStore } from '../stores/authStore';

/**
 * Search page with results
 */
function Search() {
  const { searchResults, searchTotal, searchItems, clearSearch, isLoading, error } = useInventoryStore();
  const { canEdit, isAuthenticated } = useAuthStore();
  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Check if user has permission to search items
  if (isAuthenticated() && !canEdit()) {
    return (
      <div className="text-center py-12">
        <div className="card max-w-md mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Access Restricted</h2>
          <p className="text-gray-600 mb-4">
            You need Editor or Admin permissions to search for items.
          </p>
          <p className="text-gray-500 text-sm mb-6">
            As a Viewer, you can only see the list of rooms. Contact an administrator to request elevated access.
          </p>
          <Link to="/rooms" className="btn-primary">
            Back to Rooms
          </Link>
        </div>
      </div>
    );
  }

  /**
   * Handle search form submission
   */
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    await searchItems(query);
    setHasSearched(true);
  };

  /**
   * Clear search and reset
   */
  const handleClear = () => {
    setQuery('');
    setHasSearched(false);
    clearSearch();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Search Items</h1>
        <p className="text-gray-600">
          Find items by name, catalog number, or description
        </p>
      </div>

      {/* Search form */}
      <div className="card">
        <form onSubmit={handleSearch} className="flex gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter item name or catalog number..."
            className="input flex-1"
            autoFocus
          />
          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? 'Searching...' : 'Search'}
          </button>
          {hasSearched && (
            <button type="button" onClick={handleClear} className="btn-secondary">
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      {/* Search results */}
      {hasSearched && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              Results {searchTotal > 0 && `(${searchTotal})`}
            </h2>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Searching...</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No items found matching "{query}"</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-semibold">Name</th>
                    <th className="pb-2 font-semibold">Unit Cat #</th>
                    <th className="pb-2 font-semibold">Cat #</th>
                    <th className="pb-2 font-semibold">Location</th>
                    <th className="pb-2 font-semibold">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="py-3">
                        <p className="font-medium">{item.name}</p>
                        {item.description && (
                          <p className="text-sm text-gray-500 truncate max-w-xs">
                            {item.description}
                          </p>
                        )}
                      </td>
                      <td className="py-3">
                        {item.unit_catalog_number || '-'}
                      </td>
                      <td className="py-3">
                        {item.catalog_number || '-'}
                      </td>
                      <td className="py-3">
                        {item.room_id ? (
                          <Link
                            to={`/rooms/${item.room_id}?highlight=${item.storage_unit_id || ''}`}
                            className="block text-sm hover:bg-primary-50 rounded p-1 -m-1 transition-colors"
                          >
                            {item.room_name && (
                              <p className="text-primary-600 hover:text-primary-700 font-medium">{item.room_name}</p>
                            )}
                            {item.storage_unit_label && (
                              <p className="text-gray-600">{item.storage_unit_label}</p>
                            )}
                            {item.compartment_name && (
                              <p className="text-gray-500">{item.compartment_name}</p>
                            )}
                          </Link>
                        ) : (
                          <div className="text-sm text-gray-400">No location</div>
                        )}
                      </td>
                      <td className="py-3">
                        {item.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {searchTotal > searchResults.length && (
            <p className="text-sm text-gray-500 mt-4 text-center">
              Showing {searchResults.length} of {searchTotal} results
            </p>
          )}
        </div>
      )}

      {/* Search tips */}
      {!hasSearched && (
        <div className="card bg-gray-50">
          <h3 className="font-semibold mb-2">Search Tips</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Search by item name (e.g., "screwdriver")</li>
            <li>• Search by catalog number (e.g., "ABC-123")</li>
            <li>• Partial matches are supported</li>
            <li>• Search is case-insensitive</li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default Search;
