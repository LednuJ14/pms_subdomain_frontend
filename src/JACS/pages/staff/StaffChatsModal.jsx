import React, { useEffect, useState } from 'react';
import { X, Search, Send, MessageSquare, CheckCheck, User, Loader2 } from 'lucide-react';
import { apiService } from '../../../services/api';

const StaffChatsModal = ({ isOpen, onClose }) => {
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
      const fetchChats = async () => {
        try {
          setLoading(true);
          setError(null);

          // Check if user is authenticated
          if (!apiService.isAuthenticated()) {
            setError('Please log in to view chats.');
            setLoading(false);
            return;
          }

          // Fetch existing chats with error handling
          let chatsData;
          try {
            chatsData = await apiService.getChats();
          } catch (apiErr) {
            // Handle specific error cases
            if (apiErr?.response?.status === 403) {
              setError('Access denied. You may not have permission to view chats.');
            } else if (apiErr?.response?.status === 401) {
              setError('Please log in again.');
            } else if (apiErr?.response?.status === 500) {
              setError('Server error. Please contact support or try again later.');
            } else if (apiErr?.message?.includes('CORS') || apiErr?.message?.includes('Failed to fetch')) {
              setError('Connection error. Please check your internet connection and try again.');
            } else {
              setError(apiErr?.message || 'Failed to load chats. Please try again.');
            }
            setLoading(false);
            return;
          }

          const chatsList = Array.isArray(chatsData) 
            ? chatsData 
            : (chatsData?.chats || []);

          // Filter to only show staff-manager chats (exclude tenant chats)
          // Staff should only see chats with staff_id or is_staff_manager_chat flag, and no tenant_id
          const staffManagerChats = chatsList.filter(chat => {
            // Exclude if it has a tenant_id (tenant-manager chat)
            if (chat.tenant_id || chat.tenant) {
              return false;
            }
            // Include if it has staff_id or is marked as staff-manager chat
            if (chat.staff_id || chat.staff || chat.is_staff_manager_chat || chat.is_staff_chat) {
              return true;
            }
            // Include if it doesn't have tenant info and doesn't have staff info (virtual chat)
            // This handles the case where backend returns a virtual chat for staff
            return true;
          });

          setChats(staffManagerChats);

          // Select first entry if available
          if (staffManagerChats.length > 0) {
            setCurrentChat(staffManagerChats[0]);
          } else {
            setCurrentChat(null);
          }
        } catch (err) {
          // Catch any unexpected errors
          console.error('Unexpected error loading chats:', err);
          setError(err?.message || 'An unexpected error occurred. Please try again.');
        } finally {
          setLoading(false);
        }
      };
      
      // Add a small delay to prevent rapid-fire requests
      const timeoutId = setTimeout(() => {
        fetchChats();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    } else {
      // Reset state when modal closes
      setChats([]);
      setCurrentChat(null);
      setError(null);
      setMessageText('');
    }
  }, [isOpen]);

  // Load messages when a chat is selected
  useEffect(() => {
    if (currentChat && isOpen) {
      // For virtual chats (no ID), messages are already included in the chat object
      if (!currentChat.id && currentChat.is_staff_manager_chat) {
        // Virtual chat - messages are already in the chat object
        if (!currentChat.messages) {
          currentChat.messages = [];
        }
        setCurrentTime(new Date());
        return;
      }
      
      // For real chats, load messages from API
      if (currentChat.id) {
        const loadMessages = async () => {
          try {
            const chatData = await apiService.getChat(currentChat.id);
            if (chatData) {
              // Ensure messages array exists
              if (!chatData.messages) {
                chatData.messages = [];
              }
              // For staff, filter to only show property_manager messages (already done on backend)
              setCurrentChat(chatData);
              // Update chat in chats list
              setChats(prev => prev.map(c => (c.id === chatData.id || (!c.id && !chatData.id)) ? chatData : c));
              // Update currentTime when messages are loaded
              setCurrentTime(new Date());
            }
          } catch (err) {
            // Handle errors gracefully without crashing
            console.error('Failed to load messages:', err);
            // Keep the current chat but show an error message
            if (err?.response?.status === 403 || err?.response?.status === 404) {
              setError('Cannot load messages for this chat. You may not have permission.');
            } else if (err?.response?.status === 500) {
              setError('Server error loading messages. Please try again.');
            } else {
              // Don't show error for network issues, just log it
              if (process.env.NODE_ENV === 'development') {
                console.warn('Message loading error (non-critical):', err);
              }
            }
          }
        };
        loadMessages();
      }
    }
  }, [currentChat?.id, isOpen]);

  // Real-time clock update
  useEffect(() => {
    if (!isOpen) return;
    
    // Update immediately on mount
    setCurrentTime(new Date());
    
    // Update time every 1 second for real-time relative time display
    const fastInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // 1 second for very frequent updates
    
    return () => clearInterval(fastInterval);
  }, [isOpen]);

  const filteredChats = chats.filter(chat =>
    chat.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.property?.manager?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const getManagerName = (chatObj) => {
    // For staff, always show property manager name
    if (chatObj?.property?.manager?.name) {
      return chatObj.property.manager.name;
    }
    if (chatObj?.property?.manager?.first_name || chatObj?.property?.manager?.last_name) {
      return `${chatObj.property.manager.first_name || ''} ${chatObj.property.manager.last_name || ''}`.trim();
    }
    return chatObj?.subject || 'Property Manager';
  };

  const getManagerInitials = (chatObj) => {
    const name = getManagerName(chatObj);
    if (!name) return 'PM';
    const parts = name.trim().split(' ');
    const first = parts[0]?.charAt(0) || '';
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return (first + last).toUpperCase() || 'PM';
  };

  const handleChatSelect = (chat) => {
    setCurrentChat(chat);
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!messageText.trim() || !currentChat || sendingMessage) return;

    // For staff, if chat.id is None (virtual chat), we need to find or create a real chat
    // For now, we'll try to send to the chat_id if it exists, otherwise show an error
    let targetChatId = currentChat.id;
    
    // If it's a virtual chat (no ID), we need to find an existing chat or create one
    if (!targetChatId && currentChat.is_staff_manager_chat) {
      // Try to find an existing chat with property_manager messages for this property
      // For now, we'll show an error asking the manager to start the conversation
      setError('No active conversation yet. The property manager needs to send a message first to start the conversation.');
      return;
    }
    
    // Validate chat exists
    if (!targetChatId) {
      setError('Chat does not exist yet. Please ask the property manager to start the conversation first.');
      return;
    }

    try {
      setSendingMessage(true);
      setError(null);
      
      const targetChatId = currentChat.id;
      const messageContent = messageText.trim();
      
      // Validate message content
      if (!messageContent) {
        setSendingMessage(false);
        return;
      }

      // Optimistically add message to UI immediately
      const now = new Date();
      const currentUser = apiService.getStoredUser();
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        chat_id: targetChatId,
        sender_id: currentUser?.id,
        sender_type: 'property_manager', // Backend expects 'property_manager' for non-tenant users
        content: messageContent,
        is_read: false,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      };
      
      // Add optimistic message to current chat
      const currentMessages = currentChat.messages || [];
      const optimisticChat = {
        ...currentChat,
        messages: [...currentMessages, optimisticMessage],
        last_message_at: now.toISOString()
      };
      setCurrentChat(optimisticChat);
      
      setMessageText('');
      // Update currentTime immediately so new message shows "just now"
      setCurrentTime(now);
      
      // Send message to backend
      let sendSuccess = false;
      try {
        await apiService.sendMessage({
          chat_id: targetChatId,
          content: messageContent
        });
        sendSuccess = true;
      } catch (sendErr) {
        // If send fails, remove optimistic message
        setCurrentChat({
          ...currentChat,
          messages: currentMessages
        });
        
        // Handle specific error cases
        if (sendErr?.response?.status === 403) {
          setError('Access denied. You may not have permission to send messages.');
        } else if (sendErr?.response?.status === 404) {
          setError('Chat not found. Please refresh and try again.');
        } else if (sendErr?.response?.status === 500) {
          setError('Server error. Please try again later.');
        } else if (sendErr?.message?.includes('CORS') || sendErr?.message?.includes('Failed to fetch')) {
          setError('Connection error. Please check your internet connection.');
        } else {
          setError(sendErr?.message || 'Failed to send message. Please try again.');
        }
        setSendingMessage(false);
        return;
      }
      
      // Only reload if send was successful
      if (sendSuccess) {
        try {
          // Reload chat with messages from backend to get actual message with correct ID
          const updatedChat = await apiService.getChat(targetChatId);
          if (updatedChat) {
            if (!updatedChat.messages) {
              updatedChat.messages = [];
            }
            
            // Smart merge: Replace optimistic message with backend message without changing order
            // Find the optimistic message in current chat
            const currentMessages = currentChat.messages || [];
            const optimisticIndex = currentMessages.findIndex(msg => 
              msg.id === optimisticMessage.id || 
              (msg.id && msg.id.startsWith('temp-'))
            );
            
            // Find the backend message that matches our sent message
            const backendMessage = updatedChat.messages.find(msg => 
              msg.content === messageContent && 
              msg.sender_type === 'property_manager' &&
              msg.sender_id === optimisticMessage.sender_id &&
              // Match by timestamp (within 5 seconds) to avoid matching wrong message
              Math.abs(new Date(msg.created_at).getTime() - new Date(optimisticMessage.created_at).getTime()) < 5000
            );
            
            if (backendMessage && optimisticIndex !== -1) {
              // Replace optimistic message with backend message, preserving position
              const mergedMessages = [...currentMessages];
              mergedMessages[optimisticIndex] = {
                ...backendMessage,
                // Preserve optimistic timestamp if it's more recent (to show "just now")
                created_at: new Date(optimisticMessage.created_at).getTime() > new Date(backendMessage.created_at).getTime()
                  ? optimisticMessage.created_at
                  : backendMessage.created_at,
                updated_at: new Date(optimisticMessage.updated_at).getTime() > new Date(backendMessage.updated_at).getTime()
                  ? optimisticMessage.updated_at
                  : backendMessage.updated_at
              };
              
              // Add any new messages from backend that aren't in current messages
              const existingIds = new Set(mergedMessages.map(m => m.id).filter(Boolean));
              updatedChat.messages.forEach(backendMsg => {
                if (backendMsg.id && !existingIds.has(backendMsg.id)) {
                  // Only add if it's not the message we just sent (already merged)
                  if (backendMsg.id !== backendMessage.id) {
                    mergedMessages.push(backendMsg);
                  }
                }
              });
              
              // Sort messages by created_at to maintain chronological order
              mergedMessages.sort((a, b) => {
                const timeA = new Date(a.created_at).getTime();
                const timeB = new Date(b.created_at).getTime();
                return timeA - timeB;
              });
              
              updatedChat.messages = mergedMessages;
            } else if (backendMessage) {
              // Backend message found but optimistic message not in current chat
              // Just use backend messages
              updatedChat.messages = updatedChat.messages;
            } else {
              // No matching backend message found, keep optimistic message
              // This shouldn't happen, but handle gracefully
              if (optimisticIndex !== -1) {
                updatedChat.messages = currentMessages;
              }
            }
            
            setCurrentChat(updatedChat);
            // Update time again after reload
            setCurrentTime(new Date());
          }
        } catch (reloadErr) {
          // If reload fails, keep the optimistic message but log the error
          console.warn('Could not reload chat after send:', reloadErr);
          // Don't show error to user since message was sent successfully
        }
        
        // Refresh chats list (non-blocking)
        apiService.getChats().then(chatsData => {
          const chatsList = Array.isArray(chatsData) ? chatsData : (chatsData?.chats || []);
          // Filter to only show staff-manager chats (exclude tenant chats)
          const staffManagerChats = chatsList.filter(chat => {
            if (chat.is_staff_manager_chat) return true;
            if (chat.tenant_id || chat.tenant) return false;
            return true; // Include if no tenant info
          });
          setChats(staffManagerChats);
        }).catch(refreshErr => {
          // Silently fail - chats list will update on next manual refresh
          if (process.env.NODE_ENV === 'development') {
            console.warn('Could not refresh chats after send:', refreshErr);
          }
        });
      }
    } catch (err) {
      // Catch any unexpected errors
      console.error('Unexpected error sending message:', err);
      setError(err?.message || 'An unexpected error occurred. Please try again.');
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 rounded-t-xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Staff Messages</h2>
              <p className="text-sm text-gray-500">Chat with manager</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <p className="text-sm text-red-700 flex-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-4 text-red-600 hover:text-red-800"
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Loading conversations...</span>
              </div>
            </div>
          ) : error && !chats.length ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md px-4">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-red-600 mb-2 font-medium">{error}</p>
                <p className="text-sm text-gray-500 mb-4">
                  If this problem persists, please contact support or try refreshing the page.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => {
                      setError(null);
                      setLoading(true);
                      // Retry fetching
                      apiService.getChats()
                        .then(chatsData => {
                          const chatsList = Array.isArray(chatsData) ? chatsData : (chatsData?.chats || []);
                          // Filter to only show staff-manager chats (exclude tenant chats)
                          const staffManagerChats = chatsList.filter(chat => {
                            if (chat.is_staff_manager_chat) return true;
                            if (chat.tenant_id || chat.tenant) return false;
                            return true; // Include if no tenant info
                          });
                          setChats(staffManagerChats);
                          if (staffManagerChats.length > 0) {
                            setCurrentChat(staffManagerChats[0]);
                          }
                        })
                        .catch(err => {
                          setError('Failed to load chats. Please try again.');
                        })
                        .finally(() => setLoading(false));
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Retry
                  </button>
                  <button
                    onClick={onClose}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Close
                  </button>
                </div>
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
                      <p className="text-xs">Property managers can start conversations with you</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {filteredChats.map((chat) => {
                        // Handle virtual chats (no ID) - use property_id as key
                        const chatKey = chat.id || `virtual-${chat.property_id}`;
                        const isSelected = currentChat?.id === chat.id || 
                                         (!currentChat?.id && !chat.id && currentChat?.property_id === chat.property_id);
                        
                        return (
                          <div
                            key={chatKey}
                            onClick={() => handleChatSelect(chat)}
                            className={`px-4 py-3 cursor-pointer hover:bg-white transition-colors ${
                              isSelected ? 'bg-white border-r-2 border-blue-500' : ''
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-400 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-semibold">
                                {getManagerInitials(chat)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <h3 className="font-medium text-gray-900 truncate text-sm">
                                    {getManagerName(chat)}
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
                                <span className="text-xs text-gray-500">
                                  {formatTime(chat.last_message_at || chat.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
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
                            {getManagerInitials(currentChat)}
                          </div>
                          <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                              {getManagerName(currentChat)}
                            </h2>
                            <p className="text-sm text-gray-500">Property Manager</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
                      {currentChat.messages && currentChat.messages.length > 0 ? (
                        <div className="space-y-4">
                          {currentChat.messages.map((message) => {
                            // For staff chat, all messages shown are from property_manager
                            // Staff sends as property_manager, so we need to check if it's from current staff user
                            const currentUserId = apiService.getStoredUser()?.id;
                            const isFromCurrentStaff = message.sender_id === currentUserId && message.sender_type === 'property_manager';
                            const isOutgoing = isFromCurrentStaff; // Staff's own messages are outgoing
                            
                            return (
                              <div
                                key={message.id || `msg-${message.created_at}`}
                                className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                              >
                                <div className={`max-w-md px-4 py-3 rounded-2xl ${
                                  isOutgoing
                                    ? 'bg-blue-600 text-white rounded-br-md'
                                    : 'bg-white text-gray-900 rounded-bl-md shadow-sm border border-gray-200'
                                }`}>
                                  <p className="text-sm leading-relaxed">{message.content}</p>
                                  <div className={`flex items-center justify-end space-x-1 mt-2 ${
                                    isOutgoing ? 'text-blue-100' : 'text-gray-500'
                                  }`}>
                                    <span className="text-xs">
                                      {formatTime(message.created_at)}
                                    </span>
                                    {isOutgoing && (
                                      <CheckCheck className="w-3 h-3" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
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

export default StaffChatsModal;


