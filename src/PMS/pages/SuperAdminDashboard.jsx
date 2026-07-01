import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';

const SuperAdminDashboard = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const data = await apiService.makeRequest('/properties/admin/all', { method: 'GET' });
      setProperties(data);
    } catch (err) {
      console.error('Failed to fetch properties', err);
      setError('Failed to load properties. Ensure you have Super Admin permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProperty = (property) => {
    if (!property.portal_subdomain) {
      alert("This property does not have a subdomain set.");
      return;
    }
    sessionStorage.setItem('impersonated_subdomain', property.portal_subdomain);
    // Reload to apply the new subdomain logic in api.js and redirect to dashboard
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Global Admin Dashboard</h1>
            <p className="text-slate-500 mt-2">Select a property to manage</p>
          </div>
          <button 
            onClick={() => {
              localStorage.removeItem('access_token');
              window.location.href = '/login';
            }}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors"
          >
            Logout
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map(prop => (
              <div 
                key={prop.id} 
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow flex flex-col"
              >
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-slate-800">{prop.title || prop.name}</h3>
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700">
                      ID: {prop.id}
                    </span>
                  </div>
                  <p className="text-slate-500 text-sm mt-1 mb-4">{prop.city}, {prop.province}</p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Subdomain</span>
                      <span className="font-medium text-slate-700">{prop.portal_subdomain || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Status</span>
                      <span className={`font-medium ${prop.status === 'ACTIVE' ? 'text-green-600' : 'text-slate-600'}`}>
                        {prop.status}
                      </span>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => handleSelectProperty(prop)}
                  disabled={!prop.portal_subdomain}
                  className={`mt-6 w-full py-2.5 rounded-lg font-medium transition-colors ${
                    prop.portal_subdomain 
                      ? 'bg-slate-800 text-white hover:bg-slate-700' 
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Manage Property
                </button>
              </div>
            ))}
            
            {properties.length === 0 && !error && (
              <div className="col-span-full text-center py-12 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                No properties found in the system.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
