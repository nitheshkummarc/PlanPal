import React, { useState, useEffect } from 'react';
import { 
  BellIcon, 
  CalendarDaysIcon, 
  UserIcon, 
  HeartIcon,
  ChatBubbleLeftIcon,
  CheckIcon,
  XMarkIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { notificationsApi } from '../api/notificationsApi';
import { LoadingSpinner } from '../components/ui/Loading';
import { useApi, usePagination } from '../hooks/useApi';
import { getRelativeTime, formatDistanceToNow } from '../utils/dateUtils';
import toast from 'react-hot-toast';

const Notifications = () => {
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const pagination = usePagination(1, 20);

  const {
    data: notificationsData,
    loading: notificationsLoading,
    execute: fetchNotifications
  } = useApi(notificationsApi.getNotifications);

  useEffect(() => {
    loadNotifications();
  }, [filter, pagination.page]);

  const loadNotifications = async () => {
    try {
      const params = {
        filter,
        page: pagination.page,
        per_page: pagination.limit
      };
      const result = await fetchNotifications(params);
      pagination.setTotal(result?.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      loadNotifications(); // Refresh notifications
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAsUnread = async (notificationId) => {
    try {
      await notificationsApi.markAsUnread(notificationId);
      loadNotifications(); // Refresh notifications
    } catch (error) {
      toast.error('Failed to mark as unread');
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await notificationsApi.deleteNotification(notificationId);
      toast.success('Notification deleted');
      loadNotifications(); // Refresh notifications
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const handleBulkMarkAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      toast.success('All notifications marked as read');
      loadNotifications();
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedNotifications.length === 0) return;
    
    try {
      await Promise.all(
        selectedNotifications.map(id => notificationsApi.deleteNotification(id))
      );
      toast.success(`${selectedNotifications.length} notifications deleted`);
      setSelectedNotifications([]);
      loadNotifications();
    } catch (error) {
      toast.error('Failed to delete notifications');
    }
  };

  const toggleSelectNotification = (notificationId) => {
    setSelectedNotifications(prev => {
      if (prev.includes(notificationId)) {
        return prev.filter(id => id !== notificationId);
      } else {
        return [...prev, notificationId];
      }
    });
  };

  const selectAllNotifications = () => {
    const allIds = notifications.map(n => n.id);
    setSelectedNotifications(allIds);
  };

  const deselectAllNotifications = () => {
    setSelectedNotifications([]);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'event_invitation':
      case 'event_reminder':
      case 'event_update':
        return <CalendarDaysIcon className="h-5 w-5 text-blue-600" />;
      case 'friend_request':
      case 'match':
        return <UserIcon className="h-5 w-5 text-green-600" />;
      case 'like':
        return <HeartIcon className="h-5 w-5 text-red-600" />;
      case 'message':
        return <ChatBubbleLeftIcon className="h-5 w-5 text-purple-600" />;
      default:
        return <BellIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const getNotificationColor = (type, isRead) => {
    const baseClasses = isRead 
      ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800';
    
    return `border ${baseClasses}`;
  };

  // Map notification_id to id for frontend compatibility
  const notifications = (notificationsData?.notifications || []).map(n => ({
    ...n,
    id: n.id || n.notification_id
  }));
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Notifications
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Stay updated with your activity
                {unreadCount > 0 && (
                  <span className="ml-2 bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 px-2 py-1 rounded-full text-sm">
                    {unreadCount} unread
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={handleBulkMarkAsRead}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  filter === 'all'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  filter === 'unread'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Unread ({unreadCount})
              </button>
              <button
                onClick={() => setFilter('read')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  filter === 'read'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Read
              </button>
            </div>

            {/* Bulk Actions */}
            {selectedNotifications.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedNotifications.length} selected
                </span>
                <button
                  onClick={handleBulkDelete}
                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Notifications List */}
        {notificationsLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : notifications.length > 0 ? (
          <>
            {/* Select All Controls */}
            <div className="mb-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={selectAllNotifications}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Select All
                </button>
                {selectedNotifications.length > 0 && (
                  <button
                    onClick={deselectAllNotifications}
                    className="text-gray-600 hover:text-gray-700 text-sm font-medium"
                  >
                    Deselect All
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg ${getNotificationColor(notification.type, notification.is_read)} transition-colors`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedNotifications.includes(notification.id)}
                      onChange={() => toggleSelectNotification(notification.id)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />

                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className={`text-sm ${notification.is_read ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white font-medium'}`}>
                            {notification.message}
                          </p>
                          {notification.action_url && (
                            <a
                              href={notification.action_url}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-1 inline-block"
                            >
                              View Details
                            </a>
                          )}
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDistanceToNow(notification.created_at)}
                          </span>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            {!notification.is_read ? (
                              <button
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                                title="Mark as read"
                              >
                                <CheckIcon className="h-4 w-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleMarkAsUnread(notification.id)}
                                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                title="Mark as unread"
                              >
                                <BellIcon className="h-4 w-4" />
                              </button>
                            )}
                            
                            <button
                              onClick={() => handleDelete(notification.id)}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center">
                <div className="flex items-center gap-2">
                  <button
                    onClick={pagination.prevPage}
                    disabled={!pagination.hasPrevPage}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Previous
                  </button>
                  
                  <span className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>

                  <button
                    onClick={pagination.nextPage}
                    disabled={!pagination.hasNextPage}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <BellIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No notifications
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {filter === 'unread' 
                ? "You're all caught up! No unread notifications."
                : "You don't have any notifications yet."
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
