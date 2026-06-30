import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu, Building2 } from 'lucide-react';
import { useProperty } from './PropertyContext';
import NotificationBell from './NotificationBell';

const MainLayout = ({ userType = 'manager' }) => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 768 : true;
  });
  const { property } = useProperty();

  const getFallbackPropertyName = () => {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    if (!host) return null;
    const segment = host.split('.')[0];
    if (!segment || segment.toLowerCase() === 'localhost') return null;
    return segment.replace(/[-_]/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  };

  const propertyName = property?.property_name || property?.name || property?.title || property?.building_name || getFallbackPropertyName() || 'Property Portal';

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden w-full">
      {/* Top Header Bar */}
      <header className="h-20 bg-black border-b border-gray-800 flex items-center justify-between z-30 shrink-0 shadow-sm relative">
        <div className="flex items-center w-full h-full">
          {/* Invisible spacer that precisely matches the sidebar's width */}
          <div 
            className={`transition-all duration-300 ease-in-out shrink-0 h-full ${
              sidebarOpen ? 'w-64' : 'w-0'
            }`}
          />
          
          {/* Shifting Content: Menu Button + Logo */}
          <div className="flex items-center h-full">
            {/* Menu Button - Now sits exactly outside the sidebar edge */}
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="p-2 ml-4 mr-4 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors z-40 relative flex-shrink-0"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            {/* Logo and Title Container */}
            <div className="flex items-center space-x-4 pl-4 border-l border-gray-700 h-10">
             {/* Logo */}
             <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white flex items-center justify-center overflow-hidden">
               {property?.display_settings?.logoUrl ? (
                 <img
                   src={(() => {
                     const logoUrl = property.display_settings.logoUrl;
                     let fullUrl = logoUrl;
                     if (!logoUrl.startsWith('http://') && !logoUrl.startsWith('https://')) {
                       fullUrl = `http://localhost:5001${logoUrl.startsWith('/api/') ? '' : (logoUrl.startsWith('/') ? '' : '/api/')}${logoUrl}`;
                     }
                     return `${fullUrl}?v=${property?.id || Date.now()}`;
                   })()}
                   alt="Logo"
                   className="w-full h-full object-contain p-1"
                   onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                 />
               ) : null}
               <div className="logo-fallback w-full h-full flex items-center justify-center" style={{ display: property?.display_settings?.logoUrl ? 'none' : 'flex' }}>
                 <Building2 className="w-6 h-6 text-black" />
               </div>
             </div>
             
             {/* Title */}
             <div className="hidden sm:block">
               <h1 className="text-base font-bold text-white leading-tight">{propertyName}</h1>
               <p className="text-sm text-gray-400">{property?.tagline || 'Property Portal'}</p>
             </div>
             </div>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center ml-auto pr-6 z-40 relative">
          <NotificationBell isDarkMode={true} />
        </div>
      </header>

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar 
          userType={userType} 
          isOpen={sidebarOpen} 
          setIsOpen={setSidebarOpen} 
        />
        
        {/* Scrollable Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gradient-to-br from-slate-50 to-blue-50 w-full relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
