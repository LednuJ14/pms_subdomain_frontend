import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users, 
  Building, 
  Wrench, 
  Loader2, 
  CreditCard,
  DollarSign,
  AlertCircle,
  Clock,
  Activity
} from 'lucide-react';
import Header from '../../components/Header';
import { apiService } from '../../../services/api';

const AnalyticsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [rawApiData, setRawApiData] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!apiService.isAuthenticated()) {
      navigate('/login');
      return;
    }
    
    fetchAnalyticsData();
  }, [navigate]);

  // Format currency safely
  const formatCurrency = (value) => {
    try {
      const num = Number(value);
      if (isNaN(num)) return '₱0.00';
      return `₱${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } catch {
      return '₱0.00';
    }
  };

  // Format number safely
  const formatNumber = (value) => {
    try {
      const num = Number(value);
      if (isNaN(num)) return '0';
      return num.toLocaleString('en-US');
    } catch {
      return '0';
    }
  };

  const handleDownloadReport = async (format) => {
    try {
      setDownloading(true);
      const propertyBaseURL = apiService.propertyBaseURL || 'http://localhost:5001/api';
      
      // Ensure we have data and property_id before downloading
      let currentData = data;
      if (!currentData || !currentData.propertyId) {
        console.log('Data not available, fetching...');
        // Try to fetch data first if not available
        await fetchAnalyticsData();
        // Wait a bit for state to update
        await new Promise(resolve => setTimeout(resolve, 100));
        currentData = data;
        if (!currentData || !currentData.propertyId) {
          throw new Error('Property ID is required. Please refresh the page and try again.');
        }
      }
      
      console.log('Downloading report:', {
        format,
        propertyId: currentData.propertyId,
        propertyName: currentData.propertyName
      });
      
      // Pass property_id as query parameter to ensure backend gets it
      const params = new URLSearchParams({
        property_id: currentData.propertyId.toString()
      });
      
      const url = `${propertyBaseURL}/analytics/download/${format}?${params.toString()}`;
      
      console.log('Download URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData = null;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        console.error('Download error response:', errorData);
        throw new Error(errorData.error || errorData.message || `Failed to download ${format} report`);
      }
      
      // Check content type
      const contentType = response.headers.get('content-type');
      console.log('Response content-type:', contentType);
      
      if (!contentType || (!contentType.includes('pdf') && !contentType.includes('excel') && !contentType.includes('csv') && !contentType.includes('spreadsheet') && !contentType.includes('octet-stream'))) {
        // Might be an error response
        const text = await response.text();
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.error || 'Invalid response from server');
        } catch {
          throw new Error('Invalid response format from server');
        }
      }
      
      const blob = await response.blob();
      console.log('Blob size:', blob.size, 'bytes');
      
      if (blob.size === 0) {
        throw new Error('Downloaded file is empty. Please check server logs.');
      }
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Generate filename with property name if available
      const formatExt = format === 'excel' ? 'xlsx' : format;
      const dateStr = new Date().toISOString().split('T')[0];
      const propertyName = currentData?.propertyName ? currentData.propertyName.replace(/[^a-z0-9]/gi, '_') : 'analytics';
      link.download = `${propertyName}_report_${dateStr}.${formatExt}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      console.log('Download completed successfully');
    } catch (error) {
      console.error('Error downloading report:', error);
      alert(`Failed to download ${format.toUpperCase()} report: ${error.message || 'Unknown error'}`);
    } finally {
      setDownloading(false);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const propertyBaseURL = apiService.propertyBaseURL || 'http://localhost:5001/api';
      
      // Fetch all analytics data with proper error handling
      const [dashboardResult, financialResult, occupancyResult] = await Promise.allSettled([
        apiService.get('/analytics/dashboard', { baseURL: propertyBaseURL }),
        apiService.get('/analytics/financial-summary', { baseURL: propertyBaseURL }),
        apiService.get('/analytics/occupancy-report', { baseURL: propertyBaseURL })
      ]);
      
      // Extract raw responses
      const dashboardRaw = dashboardResult.status === 'fulfilled' ? dashboardResult.value : null;
      const financialRaw = financialResult.status === 'fulfilled' ? financialResult.value : null;
      const occupancyRaw = occupancyResult.status === 'fulfilled' ? occupancyResult.value : null;
      
      // Store raw data for debugging
      const rawData = {
        dashboard: dashboardRaw,
        financial: financialRaw,
        occupancy: occupancyRaw,
        dashboardStatus: dashboardResult.status,
        financialStatus: financialResult.status,
        occupancyStatus: occupancyResult.status
      };
      setRawApiData(rawData);
      
      // Check for errors in responses
      const dashboard = dashboardRaw && !dashboardRaw.error ? dashboardRaw : null;
      const financial = financialRaw && !financialRaw.error ? financialRaw : null;
      const occupancy = occupancyRaw && !occupancyRaw.error ? occupancyRaw : null;
      
      if (!dashboard && !financial && !occupancy) {
        throw new Error('All API calls failed or returned errors');
      }
      
      // Extract ALL data from responses - be very explicit
      const dashboardMetrics = dashboard?.metrics || {};
      const dashboardProperties = dashboard?.properties || {};
      const financialTotals = financial?.totals || {};
      const overallOccupancy = occupancy?.overall_occupancy || {};
      
      // Helper to get numeric value (preserves 0, only defaults if null/undefined)
      const getNumericValue = (value, fallback = 0) => {
        if (value === null || value === undefined) {
          return fallback;
        }
        const num = Number(value);
        if (isNaN(num)) {
          return fallback;
        }
        return num;
      };
      
      // Extract unit data - prioritize occupancy report (most accurate)
      const totalUnits = getNumericValue(
        overallOccupancy?.total_units ?? dashboardProperties?.total_units ?? 0,
        0
      );
      
      const occupiedUnits = getNumericValue(
        overallOccupancy?.occupied_units ?? dashboardProperties?.occupied_units ?? 0,
        0
      );
      
      const availableUnits = getNumericValue(
        overallOccupancy?.available_units ?? dashboardProperties?.available_units ?? 0,
        0
      );
      
      // Get occupancy rate from multiple sources
      let occupancyRate = getNumericValue(
        overallOccupancy?.occupancy_rate ?? dashboardProperties?.occupancy_rate ?? dashboardMetrics?.occupancy_rate,
        null
      );
      
      // Calculate if not provided
      if (occupancyRate === null && totalUnits > 0) {
        occupancyRate = (occupiedUnits / totalUnits) * 100;
      } else if (occupancyRate === null) {
        occupancyRate = 0;
      }
      
      // Extract financial data
      const totalRevenue = getNumericValue(
        dashboardMetrics?.total_income ?? financialTotals?.total_revenue ?? 0,
        0
      );
      
      const outstandingBalance = getNumericValue(
        dashboardMetrics?.outstanding_balance ?? financialTotals?.outstanding_balance ?? 0,
        0
      );
      
      const overdueBills = getNumericValue(
        financialTotals?.overdue_bills_count ?? 0,
        0
      );
      
      // Extract activity data
      const activeTenants = getNumericValue(dashboardMetrics?.active_tenants, 0);
      const activeStaff = getNumericValue(dashboardMetrics?.active_staff, 0);
      const openRequests = dashboard?.maintenance_requests ? dashboard.maintenance_requests.length : 0;
      const pendingTasks = dashboard?.pending_tasks ? dashboard.pending_tasks.length : 0;
      const bookingsToday = getNumericValue(dashboardMetrics?.bookings_today, 0);
      const avgResolutionDays = getNumericValue(dashboardMetrics?.avg_resolution_days, 0);
      const avgMonthlyRent = getNumericValue(dashboardMetrics?.avg_monthly_rent, 0);
      
      // Build final data object with ALL real values
      const transformedData = {
        propertyId: dashboard?.property_id ?? financial?.property_id ?? occupancy?.property_id ?? null,
        propertyName: dashboard?.property_name ?? financial?.property_name ?? occupancy?.property_name ?? 'Property Analytics',
        metrics: {
          // Financial - ALL from API
          totalRevenue: totalRevenue,
          outstandingBalance: outstandingBalance,
          overdueBills: overdueBills,
          avgMonthlyRent: avgMonthlyRent,
          
          // Occupancy - ALL from API
          occupancyRate: Number(occupancyRate.toFixed(2)),
          totalUnits: totalUnits,
          occupiedUnits: occupiedUnits,
          availableUnits: availableUnits,
          
          // Activity - ALL from API
          activeTenants: activeTenants,
          activeStaff: activeStaff,
          openRequests: openRequests,
          pendingTasks: pendingTasks,
          bookingsToday: bookingsToday,
          avgResolutionDays: avgResolutionDays,
          
          // Metadata
          currentMonth: dashboardMetrics?.current_month || new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })
        },
        maintenanceRequests: Array.isArray(dashboard?.maintenance_requests) ? dashboard.maintenance_requests : [],
        pendingTasks: Array.isArray(dashboard?.pending_tasks) ? dashboard.pending_tasks : [],
        announcements: Array.isArray(dashboard?.announcements) ? dashboard.announcements : []
      };
      
      setData(transformedData);
      setLastUpdated(new Date());
      setError(null);
    } catch (e) {
      console.error('Failed to load analytics:', e);
      setError(e.message || 'Failed to load analytics data.');
      
      // Only set defaults if we truly have no data
      if (!data) {
        setData({
          propertyId: null,
          propertyName: 'Property Analytics',
          metrics: {
            totalRevenue: 0,
            outstandingBalance: 0,
            overdueBills: 0,
            avgMonthlyRent: 0,
            occupancyRate: 0,
            totalUnits: 0,
            occupiedUnits: 0,
            availableUnits: 0,
            activeTenants: 0,
            activeStaff: 0,
            openRequests: 0,
            pendingTasks: 0,
            bookingsToday: 0,
            avgResolutionDays: 0,
            currentMonth: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })
          },
          maintenanceRequests: [],
          pendingTasks: [],
          announcements: []
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          <span className="text-gray-600 font-medium">Loading analytics data...</span>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-xl shadow-lg">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Analytics</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={fetchAnalyticsData} 
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { propertyName, metrics } = data || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 w-full">
      <Header userType="manager" />

      <div className="px-4 py-6 sm:px-6 lg:px-8 w-full">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Property Analytics</h1>
                <p className="text-gray-600 text-lg">
                  {propertyName || 'Loading property information...'}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  {metrics?.currentMonth && (
                    <p className="text-sm text-gray-500">
                      {metrics.currentMonth}
                    </p>
                  )}
                  {lastUpdated && (
                    <p className="text-sm text-gray-500">
                      • Last updated: {lastUpdated.toLocaleTimeString()}
                    </p>
                  )}
                  {rawApiData && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      <Activity className="w-3 h-3" />
                      Live Data
                    </span>
                  )}
                </div>
                {error && (
                  <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    Some data may not be available. Check console for details.
                  </p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                {/* Download Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownloadReport('pdf')}
                    disabled={downloading || !data}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg text-sm"
                    title="Download PDF Report"
                  >
                    {downloading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>PDF</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleDownloadReport('excel')}
                    disabled={downloading || !data}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg text-sm"
                    title="Download Excel Report"
                  >
                    {downloading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Excel</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleDownloadReport('csv')}
                    disabled={downloading || !data}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg text-sm"
                    title="Download CSV Report"
                  >
                    {downloading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>CSV</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Primary KPI Cards - Financial */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Total Revenue (MTD)"
              value={formatCurrency(metrics?.totalRevenue ?? 0)}
              icon={<TrendingUp className="w-6 h-6" />}
              iconColor="text-green-600"
              bgColor="bg-green-50"
            />
            <KPICard
              title="Occupancy Rate"
              value={`${(metrics?.occupancyRate ?? 0).toFixed(1)}%`}
              subtitle={`${formatNumber(metrics?.occupiedUnits ?? 0)} / ${formatNumber(metrics?.totalUnits ?? 0)} units`}
              icon={<Building className="w-6 h-6" />}
              iconColor="text-purple-600"
              bgColor="bg-purple-50"
            />
            <KPICard
              title="Active Tenants"
              value={formatNumber(metrics?.activeTenants ?? 0)}
              icon={<Users className="w-6 h-6" />}
              iconColor="text-blue-600"
              bgColor="bg-blue-50"
            />
            <KPICard
              title="Outstanding Balance"
              value={formatCurrency(metrics?.outstandingBalance ?? 0)}
              subtitle={metrics?.overdueBills > 0 ? `${metrics.overdueBills} overdue bills` : 'All bills paid'}
              icon={<CreditCard className="w-6 h-6" />}
              iconColor={metrics?.overdueBills > 0 ? "text-red-600" : "text-green-600"}
              bgColor={metrics?.overdueBills > 0 ? "bg-red-50" : "bg-green-50"}
            />
          </div>

          {/* Secondary KPI Cards - Operations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Open Requests"
              value={formatNumber(metrics?.openRequests ?? 0)}
              icon={<Wrench className="w-6 h-6" />}
              iconColor="text-amber-600"
              bgColor="bg-amber-50"
            />
            <KPICard
              title="Pending Tasks"
              value={formatNumber(metrics?.pendingTasks ?? 0)}
              icon={<Clock className="w-6 h-6" />}
              iconColor="text-indigo-600"
              bgColor="bg-indigo-50"
            />
            <KPICard
              title="Available Units"
              value={formatNumber(metrics?.availableUnits ?? 0)}
              icon={<Building className="w-6 h-6" />}
              iconColor="text-green-600"
              bgColor="bg-green-50"
            />
            <KPICard
              title="Total Units"
              value={formatNumber(metrics?.totalUnits ?? 0)}
              icon={<Building className="w-6 h-6" />}
              iconColor="text-gray-600"
              bgColor="bg-gray-50"
            />
          </div>

          {/* Activity Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Avg Monthly Rent"
              value={formatCurrency(metrics?.avgMonthlyRent ?? 0)}
              icon={<DollarSign className="w-6 h-6" />}
              iconColor="text-emerald-600"
              bgColor="bg-emerald-50"
            />
          </div>


        </div>
      </div>
    </div>
  );
};

// Reusable KPI Card Component
const KPICard = ({ title, value, subtitle, icon, iconColor, bgColor }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`${bgColor} p-3 rounded-lg`}>
          <div className={iconColor}>{icon}</div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;