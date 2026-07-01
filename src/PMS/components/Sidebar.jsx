import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  User, MessageCircle, Settings, LogOut, ChevronDown, Bell, 
  Edit, CreditCard, Wrench, BarChart3, Calendar, LayoutDashboard, 
  FileText, Megaphone, Users as UsersIcon, HardHat
} from 'lucide-react';
import { apiService } from '../../services/api';
import ProfileEditModal from '../pages/property manager/ProfileEditModal';
import StaffProfileEditModal from '../pages/staff/StaffProfileEditModal';
import TenantProfileEditModal from '../pages/tenant/TenantProfileEditModal';
import SettingsModal from '../pages/property manager/SettingsModal';
import StaffSettingsModal from '../pages/staff/StaffSettingsModal';
import TenantSettingsModal from '../pages/tenant/TenantSettingsModal';
import TenantChatsModal from '../pages/tenant/TenantChatsModal';
import ChatsModal from '../pages/property manager/ChatsModal';
import StaffChatsModal from '../pages/staff/StaffChatsModal';
import StaffScheduleModal from '../pages/staff/StaffScheduleModal';

const Sidebar = ({ userType = 'manager', isOpen, setIsOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showChats, setShowChats] = useState(false);
  const [showPMChats, setShowPMChats] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  useEffect(() => {
    const user = apiService.getStoredUser();
    setCurrentUser(user);
    
    const handleUserUpdate = () => {
      setCurrentUser(apiService.getStoredUser());
    };
    
    window.addEventListener('userUpdated', handleUserUpdate);
    return () => window.removeEventListener('userUpdated', handleUserUpdate);
  }, []);

  const handleLogout = () => {
    apiService.logout();
    navigate('/login');
  };

  const handleProfileEdit = () => {
    setShowProfileEdit(true);
    setProfileDropdownOpen(false);
  };

  const handleSettings = () => {
    setShowSettings(true);
    setProfileDropdownOpen(false);
  };

  const handleProfileSave = async (updatedUser) => {
    if (updatedUser) {
      setCurrentUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const isActive = (path) => location.pathname === path;

  const isTenant = userType === 'tenant' || location.pathname.startsWith('/tenant/') || location.pathname === '/tenant';
  const isStaff = userType === 'staff' || location.pathname === '/staff' || location.pathname.startsWith('/staff/');

  const getNavigationItems = () => {
    if (isTenant) {
      return [
        { path: '/tenant', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/tenant/bills', label: 'My Bills', icon: CreditCard },
        { path: '/tenant/requests', label: 'My Requests', icon: Wrench },
        { path: '/tenant/announcements', label: 'Announcements', icon: Megaphone },
        { path: '/tenant/documents', label: 'Documents', icon: FileText },
        { path: '/tenant/feedback', label: 'Feedback', icon: MessageCircle }
      ];
    } else if (isStaff) {
      return [
        { path: '/staff', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/staff/tasks', label: 'Tasks', icon: HardHat },
        { path: '/staff/requests', label: 'Requests', icon: Wrench },
        { path: '/staff/announcements', label: 'Announcements', icon: Megaphone },
        { path: '/staff/documents', label: 'Documents', icon: FileText },
        { path: '/staff/feedback', label: 'Feedback', icon: MessageCircle }
      ];
    } else {
      // Assuming staff management is always enabled if we removed property context for simplicity here.
      // If needed, the top bar can pass staffEnabled as a prop, but typically it defaults to true.
      const staffEnabled = true;

      const items = [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/bills', label: 'Bills', icon: CreditCard },
        { path: '/requests', label: 'Requests', icon: Wrench },
        { path: '/feedback', label: 'Feedback', icon: MessageCircle },
        { path: '/announcements', label: 'Announcements', icon: Megaphone },
        { path: '/documents', label: 'Documents', icon: FileText },
        { path: '/tasks', label: 'Tasks', icon: HardHat },
        { path: '/tenants', label: 'Tenants', icon: UsersIcon },
        ...(staffEnabled ? [{ path: '/staffs', label: 'Staffs', icon: User }] : [])
      ];
      return items;
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed md:static inset-y-0 left-0 z-40 flex flex-col bg-black text-white transition-all duration-300 ease-in-out shadow-xl
          ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full w-0 overflow-hidden'}
        `}
      >
        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
          {getNavigationItems().map((item) => {
            const Icon = item.icon || LayoutDashboard;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 768) setIsOpen(false); // Close mobile menu on click
                }}
                className={`flex items-center px-3 py-3 rounded-xl transition-all duration-200 group relative whitespace-nowrap ${
                  active 
                    ? 'bg-white text-black font-semibold shadow-sm' 
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0 mr-3" />
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions (Notifications & Profile) */}
        <div className="p-4 border-t border-gray-800">
          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className={`flex items-center w-full p-2 rounded-xl transition-colors justify-between ${profileDropdownOpen ? 'bg-gray-800' : 'hover:bg-gray-800'}`}
            >
              <div className="flex items-center min-w-0">
                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {currentUser?.profile_image_url || currentUser?.avatar_url ? (
                    <img
                      src={(() => {
                        const url = currentUser.profile_image_url || currentUser.avatar_url;
                        if (url.startsWith('http')) return url;
                        return `http://localhost:5001${url.startsWith('/') ? '' : '/api/'}${url}`;
                      })()}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
                    />
                  ) : null}
                  <div className="w-full h-full flex items-center justify-center" style={{ display: (currentUser?.profile_image_url || currentUser?.avatar_url) ? 'none' : 'flex' }}>
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
                <div className="ml-3 text-left min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{currentUser?.first_name || 'Profile'}</p>
                  <p className="text-xs text-gray-400 truncate">{currentUser?.email || 'Settings'}</p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {profileDropdownOpen && (
              <div className="absolute bottom-full mb-2 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 left-0 w-full">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{currentUser?.first_name} {currentUser?.last_name}</p>
                  <p className="text-xs text-gray-500">{currentUser?.email}</p>
                </div>
                
                <button onClick={handleProfileEdit} className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <Edit className="w-4 h-4 mr-3" /> Profile
                </button>
                <button onClick={() => { isStaff ? setShowPMChats(true) : (isTenant ? setShowChats(true) : setShowPMChats(true)); setProfileDropdownOpen(false); }} className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <MessageCircle className="w-4 h-4 mr-3" /> Chats
                </button>
                {isStaff && (
                  <button onClick={() => { setShowSchedule(true); setProfileDropdownOpen(false); }} className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <Calendar className="w-4 h-4 mr-3" /> Schedule
                  </button>
                )}
                {!isTenant && !isStaff && (
                  <button onClick={() => { navigate('/analytics'); setProfileDropdownOpen(false); }} className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <BarChart3 className="w-4 h-4 mr-3" /> Analytics
                  </button>
                )}
                <button onClick={handleSettings} className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <Settings className="w-4 h-4 mr-3" /> Settings
                </button>
                
                <div className="border-t border-gray-100 my-1"></div>
                <button onClick={handleLogout} className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                  <LogOut className="w-4 h-4 mr-3" /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Modals */}
      {isTenant ? (
        <TenantProfileEditModal isOpen={showProfileEdit} onClose={() => setShowProfileEdit(false)} currentUser={currentUser} onSave={handleProfileSave} />
      ) : isStaff ? (
        <StaffProfileEditModal isOpen={showProfileEdit} onClose={() => setShowProfileEdit(false)} currentUser={currentUser} onSave={handleProfileSave} />
      ) : (
        <ProfileEditModal isOpen={showProfileEdit} onClose={() => setShowProfileEdit(false)} currentUser={currentUser} onSave={handleProfileSave} />
      )}

      {isTenant ? (
        <TenantSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} currentUser={currentUser} />
      ) : isStaff ? (
        <StaffSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} currentUser={currentUser} />
      ) : (
        <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} currentUser={currentUser} isTenant={isTenant} />
      )}

      {isTenant && <TenantChatsModal isOpen={showChats} onClose={() => setShowChats(false)} />}
      {!isTenant && (isStaff ? <StaffChatsModal isOpen={showPMChats} onClose={() => setShowPMChats(false)} /> : <ChatsModal isOpen={showPMChats} onClose={() => setShowPMChats(false)} />)}
      {isStaff && <StaffScheduleModal isOpen={showSchedule} onClose={() => setShowSchedule(false)} shifts={[]} />}
    </>
  );
};

export default Sidebar;
