import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header.jsx';
import { ClipboardList, CheckCircle2, Clock, Search, SlidersHorizontal, Loader2, Eye, Edit2, X, Calendar, User, AlertCircle } from 'lucide-react';
import { apiService } from '../../../services/api';

const StaffTasksPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'open',
    due_date: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [priorityOptions, setPriorityOptions] = useState([
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ]);
  const [statusOptions, setStatusOptions] = useState([
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ]);
  
  useEffect(() => {
    if (!apiService.isAuthenticated()) {
      navigate('/login');
      return;
    }
    
    fetchTasks();
    loadTaskEnums();
  }, [navigate]);
  
  const loadTaskEnums = async () => {
    try {
      const response = await apiService.get('/tasks/enums');
      if (response.statuses && Array.isArray(response.statuses)) {
        setStatusOptions(response.statuses);
      }
      if (response.priorities && Array.isArray(response.priorities)) {
        setPriorityOptions(response.priorities);
      }
    } catch (e) {
      console.error('Failed to load task enums:', e);
      // Keep default values if API fails
    }
  };
  
  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get tasks from API
      const response = await apiService.get('/tasks/my-tasks');
      setTasks(response.tasks || []);
    } catch (e) {
      console.error('Failed to load tasks from API:', e);
      setError('Failed to load tasks. Please try again.');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTaskDetails = async (taskId) => {
    try {
      const response = await apiService.get(`/tasks/${taskId}`);
      return response.task;
    } catch (e) {
      console.error('Failed to fetch task details:', e);
      throw e;
    }
  };
  
  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      // Normalize status to ensure it matches backend enum values
      const normalizedStatus = newStatus.toLowerCase().trim();
      console.log(`Updating task ${taskId} status to: ${normalizedStatus}`);
      
      // Update local state immediately for instant feedback
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, status: normalizedStatus } : task
        )
      );
      
      const response = await apiService.put(`/tasks/${taskId}`, { status: normalizedStatus });
      console.log('Status update response:', response);
      
      // Update with server response if available
      if (response && response.task) {
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === taskId ? { ...response.task } : task
          )
        );
      }
      
      // Reload tasks from server to ensure consistency (non-blocking)
      fetchTasks().catch(err => {
        console.error('Error refreshing tasks:', err);
      });
    } catch (e) {
      console.error('Failed to update task status:', e);
      const errorMessage = e.message || e.error || (e.response?.data?.error) || 'Unknown error';
      alert(`Failed to update task status: ${errorMessage}`);
      
      // Revert local state change on error
      await fetchTasks();
    }
  };

  const handleViewTask = async (task) => {
    try {
      // Fetch full task details
      const fullTask = await fetchTaskDetails(task.id);
      setSelectedTask(fullTask);
      setShowViewModal(true);
    } catch (e) {
      console.error('Failed to load task details:', e);
      // Fallback to using the task data we have
      setSelectedTask(task);
      setShowViewModal(true);
    }
  };

  const handleEditTask = async (task) => {
    try {
      // Fetch full task details
      const fullTask = await fetchTaskDetails(task.id);
      setSelectedTask(fullTask);
      
      // Format due_date for date input (YYYY-MM-DD)
      let dueDate = '';
      if (fullTask.due_date) {
        const date = new Date(fullTask.due_date);
        dueDate = date.toISOString().split('T')[0];
      }
      
      setEditForm({
        title: fullTask.title || '',
        description: fullTask.description || '',
        priority: (fullTask.priority || 'medium').toLowerCase(),
        status: (fullTask.status || 'open').toLowerCase(),
        due_date: dueDate
      });
      setShowEditModal(true);
    } catch (e) {
      console.error('Failed to load task for editing:', e);
      alert('Failed to load task details for editing.');
    }
  };

  const handleUpdateTask = async () => {
    if (!selectedTask) return;
    
    // Validate required fields
    if (!editForm.title || !editForm.title.trim()) {
      alert('Title is required');
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Format due_date as ISO string if provided
      let formattedDueDate = null;
      if (editForm.due_date && editForm.due_date.trim()) {
        try {
          const dateObj = new Date(editForm.due_date);
          if (!isNaN(dateObj.getTime())) {
            formattedDueDate = dateObj.toISOString();
          }
        } catch (e) {
          console.error('Invalid date format:', e);
        }
      }
      
      // Ensure description has a value (use existing if empty, but don't allow completely empty)
      const description = editForm.description.trim() || selectedTask.description || 'No description';
      
      // Normalize status to ensure it matches backend enum values
      const normalizedStatus = editForm.status.toLowerCase().trim();
      
      const updateData = {
        title: editForm.title.trim(),
        description: description,
        priority: editForm.priority.toLowerCase().trim(),
        status: normalizedStatus
      };
      
      console.log('Normalized status:', normalizedStatus);
      
      // Include due_date - send null if empty to clear it, or ISO string if provided
      if (formattedDueDate) {
        updateData.due_date = formattedDueDate;
      } else {
        // Send null to clear the due date if it was removed
        updateData.due_date = null;
      }
      
      console.log('Updating task with data:', updateData);
      const response = await apiService.put(`/tasks/${selectedTask.id}`, updateData);
      console.log('Task update response:', response);
      
      // Close modal first
      setShowEditModal(false);
      setSelectedTask(null);
      
      // Update the task in the local state immediately for instant feedback
      if (response && response.task) {
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === selectedTask.id ? { ...response.task } : task
          )
        );
      } else {
        // If response doesn't have task, update status locally
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === selectedTask.id ? { ...task, status: normalizedStatus } : task
          )
        );
      }
      
      // Refresh tasks from server to ensure consistency (but don't wait for it)
      fetchTasks().catch(err => {
        console.error('Error refreshing tasks:', err);
        // Don't show error to user since we already updated locally
      });
      
      alert('Task updated successfully!');
    } catch (e) {
      console.error('Failed to update task:', e);
      const errorMessage = e.message || e.error || (e.response?.data?.error) || 'Unknown error';
      alert(`Failed to update task: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };
  
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = search === '' || 
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      (task.description || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All Status' || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    const statusLower = (status || '').toLowerCase();
    switch (statusLower) {
      case 'open': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'in_progress': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'completed': return 'bg-green-50 text-green-700 border-green-200';
      case 'cancelled': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    const priorityLower = (priority || '').toLowerCase();
    switch (priorityLower) {
      case 'high':
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  if (loading) {
    return (
      <div className="bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading tasks...</span>
        </div>
      </div>
    );
  }

  if (error && tasks.length === 0) {
    return (
      <div className="w-full">
        <main className="px-4 py-8 w-full">
          <div className="max-w-7xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <p className="text-red-800 font-medium mb-4">{error}</p>
              <button
                onClick={fetchTasks}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="w-full">
      <main className="px-4 py-8 w-full">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">My Tasks</h1>
                <p className="text-sm text-gray-600">Track and manage your assigned tasks</p>
              </div>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="col-span-2 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" 
                  placeholder="Search tasks..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 w-full md:w-auto">
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </button>
              <select 
                className="px-3 py-2 border rounded-lg text-sm w-full md:w-auto"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option>All Status</option>
                {statusOptions.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            {filteredTasks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTasks.map((task) => {
                  const statusColor = getStatusColor(task.status);
                  const priorityColor = getPriorityColor(task.priority);
                  
                  return (
                    <div key={task.id} className="border rounded-xl p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-gray-900 flex-1">{task.title}</h3>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => handleViewTask(task)}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {task.status !== 'completed' && task.status !== 'cancelled' && (
                            <button
                              onClick={() => handleEditTask(task)}
                              className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Edit task"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {task.description && (
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{task.description}</p>
                      )}
                      
                      <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}</span>
                      </div>
                      
                      <div className="mt-3 flex items-center justify-between">
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full border ${statusColor}`}>
                          {task.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                        
                        {task.status !== 'completed' && task.status !== 'cancelled' && (
                          <select
                            value={task.status}
                            onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                            className="text-xs border rounded px-2 py-1 ml-2"
                          >
                            {statusOptions.map(s => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      
                      {task.priority && (
                        <div className="mt-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${priorityColor}`}>
                            {task.priority.toUpperCase()} PRIORITY
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">No tasks found</p>
                <p className="text-sm text-gray-600">
                  {search || statusFilter !== 'All Status' 
                    ? 'Try adjusting your search or filters' 
                    : 'No tasks have been assigned to you yet'}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* View Task Details Modal */}
      {showViewModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-gray-900">Task Details</h2>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedTask(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Title</h3>
                  <p className="text-lg font-semibold text-gray-900">{selectedTask.title}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
                  <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedTask.status)}`}>
                    {selectedTask.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Priority</h3>
                  <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(selectedTask.priority)}`}>
                    {selectedTask.priority.toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Due Date</h3>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString() : 'No due date'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Created Date</h3>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedTask.created_at ? new Date(selectedTask.created_at).toLocaleString() : 'N/A'}
                  </p>
                </div>
                {selectedTask.completed_at && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Completed Date</h3>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Date(selectedTask.completed_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {selectedTask.description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedTask.description}</p>
                </div>
              )}

              {(selectedTask.unit_id || selectedTask.tenant_id) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600" />
                    <div>
                      <h3 className="text-sm font-medium text-blue-900">Task Details</h3>
                      {selectedTask.unit_name && (
                        <p className="text-sm text-blue-700">Unit: {selectedTask.unit_name}</p>
                      )}
                      {selectedTask.tenant_name && (
                        <p className="text-sm text-blue-700">Tenant: {selectedTask.tenant_name}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              {selectedTask.status !== 'completed' && selectedTask.status !== 'cancelled' && (
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    handleEditTask(selectedTask);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Task
                </button>
              )}
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedTask(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-gray-900">Edit Task</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedTask(null);
                  setEditForm({
                    title: '',
                    description: '',
                    priority: 'medium',
                    status: 'open',
                    due_date: ''
                  });
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Add task details..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={editForm.priority}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {priorityOptions.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {statusOptions.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={editForm.due_date}
                    onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedTask(null);
                  setEditForm({
                    title: '',
                    description: '',
                    priority: 'medium',
                    status: 'open',
                    due_date: ''
                  });
                }}
                disabled={submitting}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateTask}
                disabled={submitting || !editForm.title.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? 'Updating...' : 'Update Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffTasksPage;
