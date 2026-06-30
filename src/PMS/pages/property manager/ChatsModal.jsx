import React, { useState, useEffect } from 'react';
import { X, Search, Send, MessageSquare, CheckCheck, User, Loader2 } from 'lucide-react';
import { apiService } from '../../../services/api';

const ChatsModal = ({ isOpen, onClose }) => {
  const [chats, setChats] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (isOpen) {
      const fetchChatsAndTenants = async () => {
        try {
          setLoading(true);
          setError(null);

          // Fetch existing chats
          const chatsData = await apiService.getChats();
          let chatsList = Array.isArray(chatsData) 
            ? chatsData 
            : (chatsData?.chats || []);

          // Separate tenant chats and staff chats
          const tenantChats = chatsList.filter(chat => chat.tenant_id || chat.tenant);
          const staffChats = chatsList.filter(chat => chat.staff_id || chat.staff || chat.is_staff_chat);

          // Fetch all tenants for this property (subdomain provides context)
          let tenants = [];
          try {
            const tenantsData = await apiService.getTenants();
            tenants = Array.isArray(tenantsData) ? tenantsData : (tenantsData?.tenants || []);
          } catch (tenErr) {
            console.warn('Could not load tenants for chat list:', tenErr);
          }

          // Fetch all staff for this property
          let staff = [];
          try {
            const staffData = await apiService.get('/staff');
            staff = Array.isArray(staffData) ? staffData : (staffData?.staff || []);
          } catch (staffErr) {
            console.warn('Could not load staff for chat list:', staffErr);
          }

          // Merge: ensure every tenant appears as a chat entry
          const mergedTenants = tenants.map((tenant) => {
            const existingChat = tenantChats.find(
              (c) => c.tenant_id === tenant.id || c.tenant?.id === tenant.id
            );
            if (existingChat) {
              // Ensure messages array
              if (!existingChat.messages) existingChat.messages = [];
              // Merge fresh tenant data (with unit info) into existing chat
              return {
                ...existingChat,
                tenant: {
                  ...existingChat.tenant,
                  ...tenant, // Overwrite with fresh tenant data that includes unit info
                  // Preserve existing tenant fields that might not be in fresh data
                  user: tenant.user || existingChat.tenant?.user,
                }
              };
            }
            // Placeholder chat with no messages yet
            const name =
              (tenant.user?.first_name || '') ||
              (tenant.user?.last_name || '') ||
              tenant.user?.email ||
              'Tenant';
            return {
              id: null,
              tenant_id: tenant.id,
              tenant,
              subject: name.trim() || 'Tenant',
              messages: [],
              created_at: tenant.created_at || new Date().toISOString(),
              last_message_at: tenant.created_at || new Date().toISOString(),
            };
          });

          // Merge: ensure every staff appears as a chat entry
          const mergedStaff = staff.map((staffMember) => {
            // Extract user data from staff member - handle both nested and flat structures
            const staffUser = staffMember.user || {};
            const firstName = staffUser.first_name || staffMember.first_name || '';
            const lastName = staffUser.last_name || staffMember.last_name || '';
            const email = staffUser.email || staffMember.email || '';
            const name = firstName && lastName 
              ? `${firstName} ${lastName}`.trim()
              : firstName || lastName || email || 'Staff';
            
            const existingChat = staffChats.find(
              (c) => c.staff_id === staffMember.id || c.staff?.id === staffMember.id
            );
            if (existingChat) {
              // Ensure messages array
              if (!existingChat.messages) existingChat.messages = [];
              // Merge fresh staff data into existing chat, ensuring proper structure
              const mergedStaffData = {
                id: staffMember.id,
                ...staffMember,
                user: {
                  id: staffUser.id || staffMember.user_id || staffMember.id,
                  first_name: firstName,
                  last_name: lastName,
                  email: email,
                  ...staffUser
                },
                name: name
              };
              return {
                ...existingChat,
                staff: mergedStaffData,
                staff_id: staffMember.id,
                is_staff_chat: true,
                subject: name // Update subject to staff name
              };
            }
            // Placeholder chat with no messages yet - use actual staff data
            return {
              id: null,
              staff_id: staffMember.id,
              staff: {
                id: staffMember.id,
                ...staffMember,
                user: {
                  id: staffUser.id || staffMember.user_id || staffMember.id,
                  first_name: firstName,
                  last_name: lastName,
                  email: email,
                  ...staffUser
                },
                name: name
              },
              subject: name,
              messages: [],
              is_staff_chat: true,
              created_at: staffMember.created_at || new Date().toISOString(),
              last_message_at: staffMember.created_at || new Date().toISOString(),
            };
          });

          // Combine tenant and staff chats, with existing chats that don't match any tenant/staff
          const orphanChats = chatsList.filter(
            (c) => !tenants.find((t) => t.id === c.tenant_id || t.id === c.tenant?.id) &&
                   !staff.find((s) => s.id === c.staff_id || s.id === c.staff?.id)
          );

          const finalList = [...mergedTenants, ...mergedStaff, ...orphanChats];
          setChats(finalList);

          // Select first entry
          if (finalList.length > 0) {
            setCurrentChat(finalList[0]);
          } else {
            setCurrentChat(null);
          }
        } catch (err) {
          console.error('Failed to load chats/tenants:', err);
          setError('Failed to load chats. Please try again.');
        } finally {
          setLoading(false);
        }
      };
      fetchChatsAndTenants();
    }
  }, [isOpen]);

  // Load messages when a chat is selected
  useEffect(() => {
    if (currentChat && currentChat.id) {
      const loadMessages = async () => {
        try {
          const [chatData, tenantsData, staffData] = await Promise.all([
            apiService.getChat(currentChat.id),
            apiService.getTenants().catch(() => []), // Fetch tenants to preserve unit info
            apiService.get('/staff').catch(() => []) // Fetch staff to preserve staff info
          ]);
          
          if (chatData) {
            // Ensure messages array exists
            if (!chatData.messages) {
              chatData.messages = [];
            }
            
            // Merge fresh tenant data if available to preserve unit info
            if (chatData.tenant_id || chatData.tenant?.id) {
              const tenantsList = Array.isArray(tenantsData) ? tenantsData : (tenantsData?.tenants || []);
              const freshTenant = tenantsList.find(
                (t) => t.id === chatData.tenant_id || t.id === chatData.tenant?.id
              );
              if (freshTenant && chatData.tenant) {
                chatData.tenant = {
                  ...chatData.tenant,
                  ...freshTenant,
                  user: freshTenant.user || chatData.tenant.user,
                };
              }
            }
            
            // Merge fresh staff data if available
            if (chatData.staff_id || chatData.staff?.id) {
              const staffList = Array.isArray(staffData) ? staffData : (staffData?.staff || []);
              const freshStaff = staffList.find(
                (s) => s.id === chatData.staff_id || s.id === chatData.staff?.id
              );
              if (freshStaff) {
                const staffUser = freshStaff.user || {};
                const firstName = staffUser.first_name || freshStaff.first_name || '';
                const lastName = staffUser.last_name || freshStaff.last_name || '';
                const email = staffUser.email || freshStaff.email || '';
                const name = firstName && lastName 
                  ? `${firstName} ${lastName}`.trim()
                  : firstName || lastName || email || 'Staff';
                
                chatData.staff = {
                  ...chatData.staff,
                  ...freshStaff,
                  user: staffUser,
                  name: name
                };
              } else if (chatData.staff) {
                // Ensure staff has proper structure even if fresh data not found
                const staff = chatData.staff;
                const user = staff.user || {};
                if (!staff.name) {
                  const firstName = user.first_name || '';
                  const lastName = user.last_name || '';
                  const email = user.email || '';
                  chatData.staff.name = firstName && lastName 
                    ? `${firstName} ${lastName}`.trim()
                    : firstName || lastName || email || 'Staff';
                }
              }
            }
            
            setCurrentChat(chatData);
            // Update chat in chats list
            setChats(prev => prev.map(c => c.id === chatData.id ? chatData : c));
            // Update currentTime when messages are loaded to ensure accurate timestamps
            setCurrentTime(new Date());
          }
        } catch (err) {
          console.error('Failed to load messages:', err);
        }
      };
      loadMessages();
    }
  }, [currentChat?.id]);

  // Real-time clock update
  useEffect(() => {
    if (!isOpen) return;
    
    // Update immediately on mount
    setCurrentTime(new Date());
    
    // Update time every 1 second for very recent messages, then every 5 seconds
    // This ensures "just now" and "X seconds ago" update smoothly
    const fastInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // 1 second for very frequent updates
    
    return () => clearInterval(fastInterval);
  }, [isOpen]);

  const filteredChats = chats.filter(chat =>
    chat.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.tenant?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.staff?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTenantInitials = (chat) => {
    if (chat?.is_staff_chat || chat?.staff_id || chat?.staff) {
      // Staff chat
      const staff = chat?.staff || {};
      const user = staff?.user || {};
      const firstName = user?.first_name || staff?.first_name || '';
      const lastName = user?.last_name || staff?.last_name || '';
      const email = user?.email || staff?.email || '';
      const name = chat?.staff?.name || 
                   (firstName && lastName ? `${firstName} ${lastName}`.trim() : firstName || lastName) ||
                   email ||
                   chat?.subject ||
                   'ST';
      const parts = name.trim().split(' ').filter(Boolean);
      const first = parts[0]?.charAt(0) || '';
      const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
      return (first + last).toUpperCase() || 'ST';
    } else {
      // Tenant chat
      const name =
        chat?.tenant?.name ||
        (chat?.tenant?.user?.first_name || '') + ' ' + (chat?.tenant?.user?.last_name || '') ||
        chat?.tenant?.user?.email ||
        'TN';
      const parts = name.trim().split(' ').filter(Boolean);
      const first = parts[0]?.charAt(0) || '';
      const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
      return (first + last).toUpperCase() || 'TN';
    }
  };
  const getUnitName = (chat) => {
    // Staff chats don't have units
    if (chat?.is_staff_chat || chat?.staff_id || chat?.staff) {
      return null;
    }
    const rent = chat?.tenant?.current_rent;
    const unit =
      rent?.unit ||
      chat?.tenant?.unit ||
      chat?.tenant?.current_rent?.unit || // Explicit check
      chat?.unit;

    // Check all possible sources for unit name
    const candidates = [
      // From unit object
      unit?.unit_name,
      unit?.unit_number,
      unit?.name,
      // From rent object
      rent?.unit?.unit_name,
      rent?.unit?.unit_number,
      rent?.unit?.name,
      rent?.unit_name,
      rent?.unit_number,
      // From tenant object directly
      chat?.tenant?.current_rent?.unit?.unit_name,
      chat?.tenant?.current_rent?.unit?.unit_number,
      chat?.tenant?.current_rent?.unit?.name,
      chat?.tenant?.unit_name,
      chat?.tenant?.unit_number,
      chat?.tenant?.assigned_room,
      chat?.tenant?.room_number,
      // From chat object
      chat?.unit_name,
      chat?.unit_number,
      // Fallback to unit_id
      rent?.unit_id ? `Unit ${rent.unit_id}` : null,
      rent?.unit?.id ? `Unit ${rent.unit.id}` : null,
      chat?.tenant?.current_rent?.unit_id ? `Unit ${chat.tenant.current_rent.unit_id}` : null,
      chat?.tenant?.current_rent?.unit?.id ? `Unit ${chat.tenant.current_rent.unit.id}` : null,
      chat?.tenant?.unit_id ? `Unit ${chat.tenant.unit_id}` : null,
      chat?.unit_id ? `Unit ${chat.unit_id}` : null,
    ];

    const name = candidates.find((v) => v && String(v).trim() !== '' && String(v).trim() !== 'null' && String(v).trim() !== 'undefined');
    
    return name || 'Unit';
  };

  const handleChatSelect = (chat) => {
    setCurrentChat(chat);
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!messageText.trim() || !currentChat || sendingMessage) return;

    try {
      setSendingMessage(true);
      setError(null);
      
      let targetChatId = currentChat.id;
      
      // If it's a placeholder chat (no ID), we can't send messages
      // For tenant chats, tenants need to start the conversation
      // For staff chats, the chat should already exist (created when staff is created)
      if (!targetChatId) {
        if (currentChat.is_staff_chat || currentChat.staff_id) {
          throw new Error('Staff chat not initialized. Please refresh the page.');
        } else {
          throw new Error('Chat does not exist yet. The tenant needs to start the conversation first. Please ask the tenant to send you a message.');
        }
      } else {
        // Optimistically add message to UI immediately
        const now = new Date();
        const messageContent = messageText; // Save before clearing
        const optimisticMessage = {
          id: `temp-${Date.now()}`,
          chat_id: targetChatId,
          sender_id: apiService.getStoredUser()?.id,
          sender_type: 'property_manager',
          content: messageContent,
          is_read: false,
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        };
        
        // Add optimistic message to current chat
        const currentMessages = currentChat.messages || [];
        setCurrentChat({
          ...currentChat,
          messages: [...currentMessages, optimisticMessage],
          last_message_at: now.toISOString()
        });
        
        setMessageText('');
        // Update currentTime immediately so new message shows "just now"
        setCurrentTime(now);
        
        // Send message to backend
        try {
          await apiService.sendMessage({
            chat_id: targetChatId,
            content: messageContent
          });
        } catch (sendErr) {
          // If send fails, remove optimistic message
          setCurrentChat({
            ...currentChat,
            messages: currentMessages
          });
          throw sendErr;
        }
        
        // Reload chat with messages from backend to get actual message with correct ID
        const updatedChat = await apiService.getChat(targetChatId);
        if (updatedChat && !updatedChat.messages) {
          updatedChat.messages = [];
        }
        
        // Merge backend messages but preserve optimistic timestamp for the message we just sent
        if (updatedChat && updatedChat.messages && updatedChat.messages.length > 0) {
          // Find the message we just sent by matching content and sender
          const sentMessageIndex = updatedChat.messages.findIndex(msg => 
            msg.content === messageContent && 
            msg.sender_type === 'property_manager' &&
            msg.sender_id === optimisticMessage.sender_id
          );
          
          if (sentMessageIndex !== -1) {
            const sentMessage = updatedChat.messages[sentMessageIndex];
            const optimisticTimestamp = new Date(optimisticMessage.created_at).getTime();
            const backendTimestamp = new Date(sentMessage.created_at).getTime();
            
            // If backend timestamp is significantly older (more than 1 minute difference), 
            // it's likely a timezone issue - use our optimistic timestamp instead
            // Also, always prefer the more recent timestamp
            const timeDiff = optimisticTimestamp - backendTimestamp;
            if (timeDiff > 60000 || timeDiff < -60000) {
              // Use optimistic timestamp if there's a big discrepancy (timezone issue)
              updatedChat.messages[sentMessageIndex] = {
                ...sentMessage,
                created_at: optimisticMessage.created_at,
                updated_at: optimisticMessage.updated_at
              };
            } else if (optimisticTimestamp > backendTimestamp) {
              // Use optimistic timestamp if it's more recent (shouldn't happen, but just in case)
              updatedChat.messages[sentMessageIndex] = {
                ...sentMessage,
                created_at: optimisticMessage.created_at,
                updated_at: optimisticMessage.updated_at
              };
            }
          }
        }
        
        setCurrentChat(updatedChat || currentChat);
        // Update time again after reload
        setCurrentTime(new Date());
        
        // Refresh chats list (keep tenants and staff merged) for existing chats
        try {
          const [chatsData, tenantsData, staffData] = await Promise.all([
            apiService.getChats(),
            apiService.getTenants().catch(() => []), // Fetch tenants to preserve unit info
            apiService.get('/staff').catch(() => []) // Fetch staff to preserve staff info
          ]);
          
          const chatsList = Array.isArray(chatsData) 
            ? chatsData 
            : (chatsData?.chats || []);
          const tenantsList = Array.isArray(tenantsData) ? tenantsData : (tenantsData?.tenants || []);
          const staffList = Array.isArray(staffData) ? staffData : (staffData?.staff || []);
          
          // Separate tenant and staff chats
          const tenantChats = chatsList.filter(chat => chat.tenant_id || chat.tenant);
          const staffChats = chatsList.filter(chat => chat.staff_id || chat.staff || chat.is_staff_chat);
          
          // Merge with existing chats in state, preserving unit info and staff info
          setChats((prev) => {
            // Process tenant chats
            const mergedTenants = prev.filter(e => e.tenant_id || e.tenant).map((entry) => {
              const updated = tenantChats.find(
                (c) => c.tenant_id === entry.tenant_id || c.tenant?.id === entry.tenant?.id
              );
              const freshTenant = tenantsList.find(
                (t) => t.id === entry.tenant_id || t.id === entry.tenant?.id
              );
              
              if (updated) {
                if (!updated.messages) updated.messages = [];
                if (freshTenant) {
                  updated.tenant = {
                    ...updated.tenant,
                    ...freshTenant,
                    user: freshTenant.user || updated.tenant?.user,
                  };
                }
                return updated;
              }
              if (freshTenant && entry.tenant) {
                return {
                  ...entry,
                  tenant: {
                    ...entry.tenant,
                    ...freshTenant,
                    user: freshTenant.user || entry.tenant.user,
                  }
                };
              }
              return entry;
            });
            
            // Process staff chats
            const mergedStaff = prev.filter(e => e.staff_id || e.staff || e.is_staff_chat).map((entry) => {
              const updated = staffChats.find(
                (c) => c.staff_id === entry.staff_id || c.staff?.id === entry.staff?.id
              );
              const freshStaff = staffList.find(
                (s) => s.id === entry.staff_id || s.id === entry.staff?.id
              );
              
              if (updated) {
                if (!updated.messages) updated.messages = [];
                if (freshStaff) {
                  const staffUser = freshStaff.user || {};
                  const firstName = staffUser.first_name || freshStaff.first_name || '';
                  const lastName = staffUser.last_name || freshStaff.last_name || '';
                  const email = staffUser.email || freshStaff.email || '';
                  const name = firstName && lastName 
                    ? `${firstName} ${lastName}`.trim()
                    : firstName || lastName || email || 'Staff';
                  
                  updated.staff = {
                    ...updated.staff,
                    ...freshStaff,
                    user: staffUser,
                    name: name
                  };
                }
                return updated;
              }
              if (freshStaff && entry.staff) {
                const staffUser = freshStaff.user || {};
                const firstName = staffUser.first_name || freshStaff.first_name || '';
                const lastName = staffUser.last_name || freshStaff.last_name || '';
                const email = staffUser.email || freshStaff.email || '';
                const name = firstName && lastName 
                  ? `${firstName} ${lastName}`.trim()
                  : firstName || lastName || email || 'Staff';
                
                return {
                  ...entry,
                  staff: {
                    ...entry.staff,
                    ...freshStaff,
                    user: staffUser,
                    name: name
                  }
                };
              }
              return entry;
            });

            // Add any new chats that weren't in prev
            const newTenantChats = tenantChats.map((c) => {
              const freshTenant = tenantsList.find(
                (t) => t.id === c.tenant_id || t.id === c.tenant?.id
              );
              if (freshTenant && c.tenant) {
                c.tenant = {
                  ...c.tenant,
                  ...freshTenant,
                  user: freshTenant.user || c.tenant.user,
                };
              }
              return c;
            }).filter(
              (c) =>
                !mergedTenants.find(
                  (m) => m.id === c.id || m.tenant_id === c.tenant_id || m.tenant?.id === c.tenant?.id
                )
            );
            
            const newStaffChats = staffChats.map((c) => {
              const freshStaff = staffList.find(
                (s) => s.id === c.staff_id || s.id === c.staff?.id
              );
              if (freshStaff && c.staff) {
                const staffUser = freshStaff.user || {};
                const firstName = staffUser.first_name || freshStaff.first_name || '';
                const lastName = staffUser.last_name || freshStaff.last_name || '';
                const email = staffUser.email || freshStaff.email || '';
                const name = firstName && lastName 
                  ? `${firstName} ${lastName}`.trim()
                  : firstName || lastName || email || 'Staff';
                
                c.staff = {
                  ...c.staff,
                  ...freshStaff,
                  user: staffUser,
                  name: name
                };
              }
              return c;
            }).filter(
              (c) =>
                !mergedStaff.find(
                  (m) => m.id === c.id || m.staff_id === c.staff_id || m.staff?.id === c.staff?.id
                )
            );

            return [...mergedTenants, ...mergedStaff, ...newTenantChats, ...newStaffChats];
          });
        } catch (refreshErr) {
          console.warn('Could not refresh chats after send:', refreshErr);
        }
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    
    try {
      // Parse the date string properly - handle ISO strings, timestamps, etc.
      let date;
      if (typeof dateString === 'string') {
        // Try parsing as ISO string first
        date = new Date(dateString);
        // If that fails, try as timestamp
        if (isNaN(date.getTime()) && !isNaN(Number(dateString))) {
          date = new Date(Number(dateString));
        }
      } else if (typeof dateString === 'number') {
        date = new Date(dateString);
      } else {
        date = new Date(dateString);
      }
      
      const now = currentTime || new Date(); // Use currentTime state for real-time updates
      
      // Validate dates
      if (isNaN(date.getTime()) || isNaN(now.getTime())) {
        return '';
      }
      
      // Calculate time difference in milliseconds
      const diffInMs = now.getTime() - date.getTime();
      
      // Handle negative differences (future dates or timezone issues) - treat as just now
      if (diffInMs < 0) {
        return 'just now';
      }
      
      const diffInSeconds = Math.floor(diffInMs / 1000);
      const diffInMinutes = Math.floor(diffInSeconds / 60);
      const diffInHours = Math.floor(diffInMinutes / 60);
      const diffInDays = Math.floor(diffInHours / 24);
      
      // Show relative time for recent messages
      if (diffInSeconds < 10) {
        return 'just now';
      } else if (diffInSeconds < 60) {
        return `${diffInSeconds} ${diffInSeconds === 1 ? 'second' : 'seconds'} ago`;
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
      } else if (diffInDays < 7) {
        return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
      } else {
        // For older messages, show the actual date/time
        return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: diffInDays > 365 ? 'numeric' : undefined });
      }
    } catch (error) {
      // Fallback to empty string if parsing fails
      return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 rounded-t-xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Messages</h2>
              <p className="text-sm text-gray-500">Communicate with tenants</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Loading conversations...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Chat List */}
              <div className="w-1/3 bg-gray-50 border-r border-gray-200 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
                <div className="flex-1 overflow-y-auto">
                  {filteredChats.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm font-medium mb-1">No conversations yet</p>
                      <p className="text-xs">Tenants can start conversations with you</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {filteredChats.map((chat) => (
                        <div
                          key={chat.id}
                          onClick={() => handleChatSelect(chat)}
                          className={`px-4 py-3 cursor-pointer hover:bg-white transition-colors ${
                            currentChat?.id === chat.id ? 'bg-white border-r-2 border-blue-500' : ''
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-400 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-semibold">
                              {getTenantInitials(chat)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="font-medium text-gray-900 truncate text-sm">
                                  {chat.is_staff_chat || chat.staff_id || chat.staff
                                    ? (() => {
                                        const staff = chat.staff || {};
                                        const user = staff.user || {};
                                        const firstName = user.first_name || '';
                                        const lastName = user.last_name || '';
                                        const email = user.email || '';
                                        // Prefer staff.name, then subject, then constructed name
                                        return staff.name || 
                                               chat.subject ||
                                               (firstName && lastName ? `${firstName} ${lastName}`.trim() : firstName || lastName) ||
                                               email ||
                                               'Staff';
                                      })()
                                    : (chat.tenant?.name || 
                                       (chat.tenant?.user?.first_name && chat.tenant?.user?.last_name 
                                        ? `${chat.tenant.user.first_name} ${chat.tenant.user.last_name}`.trim()
                                        : chat.tenant?.user?.first_name || chat.tenant?.user?.last_name) ||
                                       chat.tenant?.user?.email || 
                                       chat.subject || 
                                       'Tenant')}
                                </h3>
                                {chat.unread_count > 0 && (
                                  <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                    {chat.unread_count}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 truncate mb-1">
                                {chat.last_message?.content || (chat.messages && chat.messages.length > 0
                                  ? chat.messages[chat.messages.length - 1].content
                                  : 'No messages yet')}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {chat.is_staff_chat || chat.staff_id || chat.staff ? 'Staff Conversation' : getUnitName(chat)}
                              </p>
                              <span className="text-xs text-gray-500">
                                {formatTime(chat.last_message_at || chat.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 bg-white flex flex-col">
                {currentChat ? (
                  <>
                    <div className="px-6 py-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-400 rounded-lg flex items-center justify-center text-white font-semibold">
                            {getTenantInitials(currentChat)}
                          </div>
                          <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                              {currentChat.is_staff_chat || currentChat.staff_id || currentChat.staff
                                ? (() => {
                                    const staff = currentChat.staff || {};
                                    const user = staff.user || {};
                                    const firstName = user.first_name || '';
                                    const lastName = user.last_name || '';
                                    const email = user.email || '';
                                    // Prefer staff.name, then subject, then constructed name
                                    return staff.name || 
                                           currentChat.subject ||
                                           (firstName && lastName ? `${firstName} ${lastName}`.trim() : firstName || lastName) ||
                                           email?.split('@')[0] ||
                                           'Staff';
                                  })()
                                : (currentChat.tenant?.name || 
                                   (currentChat.tenant?.user?.first_name && currentChat.tenant?.user?.last_name 
                                    ? `${currentChat.tenant.user.first_name} ${currentChat.tenant.user.last_name}`.trim()
                                    : currentChat.tenant?.user?.first_name || currentChat.tenant?.user?.last_name) ||
                                   currentChat.tenant?.user?.email?.split('@')[0] || 
                                   currentChat.subject || 
                                   'Tenant')}
                            </h2>
                            <p className="text-sm text-gray-500">
                              {currentChat.is_staff_chat || currentChat.staff_id || currentChat.staff
                                ? 'Staff Conversation'
                                : `Tenant Conversation • ${getUnitName(currentChat) || 'N/A'}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
                      {currentChat.messages && currentChat.messages.length > 0 ? (
                        <div className="space-y-4">
                          {currentChat.messages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex ${message.sender_type === 'property_manager' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`max-w-md px-4 py-3 rounded-2xl ${
                                message.sender_type === 'property_manager'
                                  ? 'bg-blue-600 text-white rounded-br-md'
                                  : 'bg-white text-gray-900 rounded-bl-md shadow-sm border border-gray-200'
                              }`}>
                                <p className="text-sm leading-relaxed">{message.content}</p>
                                <div className={`flex items-center justify-end space-x-1 mt-2 ${
                                  message.sender_type === 'property_manager' ? 'text-blue-100' : 'text-gray-500'
                                }`}>
                                  <span className="text-xs">
                                    {formatTime(message.created_at)}
                                  </span>
                                  {message.sender_type === 'property_manager' && (
                                    <CheckCheck className="w-3 h-3" />
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 py-12">
                          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg font-medium mb-2">No messages yet</p>
                          <p className="text-sm">Start the conversation below</p>
                        </div>
                      )}
                    </div>

                    <div className="px-6 py-4 border-t border-gray-200 bg-white">
                      <form onSubmit={handleSendMessage} className="flex items-end space-x-3">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            placeholder="Type your message..."
                            disabled={sendingMessage}
                            onKeyPress={handleKeyPress}
                            className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 resize-none"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={sendingMessage || !messageText.trim()}
                          className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {sendingMessage ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Send className="w-5 h-5" />
                          )}
                        </button>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <MessageSquare className="w-20 h-20 mx-auto mb-6 text-gray-300" />
                      <p className="text-xl font-medium mb-2">Select a conversation</p>
                      <p className="text-sm">Choose a conversation from the list</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatsModal;
