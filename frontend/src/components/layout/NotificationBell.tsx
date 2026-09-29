import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellIcon } from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';
import { notificationsApi } from '../../api/notificationsApi';
import { useAuth } from '../../context/AuthContext';
import { formatDate, formatTime } from '../../utils/dateUtils';
import { notifyNotificationsChanged, onNotificationsChanged } from '../../utils/helpers';
import type { AppNotification } from '../../types';

const POLL_INTERVAL_MS = 30000;

const NotificationBell = () => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const refreshCount = useCallback(async () => {
    try {
      setUnreadCount(await notificationsApi.getUnreadCount());
    } catch {
      // Keep the last known count; the next poll retries
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    void refreshCount();
    // Poll only while the tab is visible; refresh as soon as it becomes visible again
    const interval = setInterval(() => {
      if (!document.hidden) void refreshCount();
    }, POLL_INTERVAL_MS);
    const handleVisibility = () => {
      if (!document.hidden) void refreshCount();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    const unsubscribe = onNotificationsChanged(() => void refreshCount());
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      unsubscribe();
    };
  }, [isAuthenticated, refreshCount]);

  const handleToggle = async () => {
    const opening = !isOpen;
    setIsOpen(opening);
    if (!opening) return;
    setLoading(true);
    try {
      const response = await notificationsApi.getNotifications({ filter: 'unread', per_page: 10 });
      setNotifications(response.notifications);
      setUnreadCount(response.unread_count);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      setNotifications((prev) => prev.filter((n) => n.notification_id !== notificationId));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      notifyNotificationsChanged();
    } catch {
      // Left unread; the user can retry
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications([]);
      setUnreadCount(0);
      notifyNotificationsChanged();
    } catch {
      // Left unread; the user can retry
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        {unreadCount > 0 ? <BellSolidIcon className="h-6 w-6" /> : <BellIcon className="h-6 w-6" />}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">No unread notifications</div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.notification_id}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer bg-blue-50 dark:bg-blue-900/20"
                    onClick={() => markAsRead(notification.notification_id)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-2 h-2 rounded-full mt-2 bg-blue-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(notification.created_at)} at {formatTime(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="block text-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}

      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
    </div>
  );
};

export default NotificationBell;
