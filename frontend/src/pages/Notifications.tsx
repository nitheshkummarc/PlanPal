import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BellIcon,
  CalendarDaysIcon,
  CheckIcon,
  ClockIcon,
  PencilSquareIcon,
  SparklesIcon,
  TrashIcon,
  UserMinusIcon,
  UserPlusIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { notificationsApi, type NotificationFilter } from '../api/notificationsApi';
import { LoadingSpinner } from '../components/ui/Loading';
import { usePagination } from '../hooks/useApi';
import { formatDistanceToNow } from '../utils/dateUtils';
import { getApiErrorMessage, notifyNotificationsChanged, onNotificationsChanged } from '../utils/helpers';
import type { AppNotification, NotificationType } from '../types';

const PER_PAGE = 20;

const ICONS: Record<NotificationType, { icon: typeof BellIcon; color: string }> = {
  welcome: { icon: SparklesIcon, color: 'text-yellow-500' },
  event_joined: { icon: CalendarDaysIcon, color: 'text-green-600' },
  event_reminder: { icon: ClockIcon, color: 'text-blue-600' },
  event_update: { icon: PencilSquareIcon, color: 'text-blue-600' },
  new_participant: { icon: UserPlusIcon, color: 'text-green-600' },
  participant_left: { icon: UserMinusIcon, color: 'text-orange-500' },
  event_cancelled: { icon: XCircleIcon, color: 'text-red-600' },
};

const FILTERS: { id: NotificationFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'read', label: 'Read' },
];

const Notifications = () => {
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const pagination = usePagination(PER_PAGE);
  const { page, setTotal, reset: resetPage } = pagination;

  const load = useCallback(async () => {
    try {
      const response = await notificationsApi.getNotifications({ filter, page, per_page: PER_PAGE });
      setNotifications(response.notifications);
      setUnreadCount(response.unread_count);
      setTotal(response.pagination.total);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load notifications'));
    } finally {
      setLoading(false);
    }
  }, [filter, page, setTotal]);

  useEffect(() => {
    void load();
    return onNotificationsChanged(() => void load());
  }, [load]);

  const changeFilter = (next: NotificationFilter) => {
    setFilter(next);
    setSelected([]);
    resetPage();  // the new filter may have fewer pages than the current page number
  };

  /** Run a change, then reload this page and the navbar bell. */
  const apply = async (action: () => Promise<unknown>, failure: string, success?: string) => {
    try {
      await action();
      if (success) toast.success(success);
    } catch (error) {
      toast.error(getApiErrorMessage(error, failure));
    }
    notifyNotificationsChanged();
  };

  const deleteSelected = async () => {
    const results = await Promise.allSettled(selected.map((id) => notificationsApi.deleteNotification(id)));
    const failed = results.filter((result) => result.status === 'rejected').length;
    if (failed) {
      toast.error(`${failed} of ${selected.length} notifications could not be deleted`);
    } else {
      toast.success(`${selected.length} notification${selected.length === 1 ? '' : 's'} deleted`);
    }
    setSelected([]);
    notifyNotificationsChanged();
  };

  const clearAll = async () => {
    if (!window.confirm('Delete all your notifications? This cannot be undone.')) return;
    setSelected([]);
    await apply(() => notificationsApi.deleteAllNotifications(), 'Failed to delete notifications', 'All notifications deleted');
  };

  const toggleSelected = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Stay updated with your activity
              {unreadCount > 0 && (
                <span className="ml-2 bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 px-2 py-1 rounded-full text-sm">
                  {unreadCount} unread
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {unreadCount > 0 && (
              <button
                onClick={() => apply(() => notificationsApi.markAllAsRead(), 'Failed to mark all as read', 'All notifications marked as read')}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Mark all as read
              </button>
            )}
            {pagination.total > 0 && filter === 'all' && (
              <button onClick={clearAll} className="text-red-600 hover:text-red-700 text-sm font-medium">Clear all</button>
            )}
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {FILTERS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => changeFilter(id)}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  filter === id
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {id === 'unread' ? `${label} (${unreadCount})` : label}
              </button>
            ))}
          </div>
          {selected.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">{selected.length} selected</span>
              <button onClick={deleteSelected} className="text-red-600 hover:text-red-700 text-sm font-medium">Delete</button>
              <button onClick={() => setSelected([])} className="text-gray-600 hover:text-gray-700 text-sm font-medium">Deselect</button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <BellIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No notifications</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {filter === 'unread' ? "You're all caught up!" : "You don't have any notifications here."}
            </p>
          </div>
        ) : (
          <>
            <button
              onClick={() => setSelected(notifications.map((n) => n.notification_id))}
              className="mb-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Select all on this page
            </button>

            <ul className="space-y-3">
              {notifications.map((notification) => {
                const { icon: Icon, color } = ICONS[notification.type] ?? { icon: BellIcon, color: 'text-gray-600' };
                const id = notification.notification_id;
                return (
                  <li
                    key={id}
                    className={`p-4 rounded-lg border transition-colors ${
                      notification.is_read
                        ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                        : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selected.includes(id)}
                        onChange={() => toggleSelected(id)}
                        aria-label="Select notification"
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <Icon className={`h-5 w-5 mt-1 flex-shrink-0 ${color}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${notification.is_read ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white font-medium'}`}>
                          {notification.message}
                        </p>
                        {notification.event_id && (
                          <Link to={`/events/${notification.event_id}`} className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-1 inline-block">
                            View event
                          </Link>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{formatDistanceToNow(notification.created_at)}</span>
                        {notification.is_read ? (
                          <button
                            onClick={() => apply(() => notificationsApi.markAsUnread(id), 'Failed to mark as unread')}
                            className="p-1 text-gray-400 hover:text-blue-600" title="Mark as unread"
                          >
                            <BellIcon className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => apply(() => notificationsApi.markAsRead(id), 'Failed to mark as read')}
                            className="p-1 text-gray-400 hover:text-green-600" title="Mark as read"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => apply(() => notificationsApi.deleteNotification(id), 'Failed to delete notification', 'Notification deleted')}
                          className="p-1 text-gray-400 hover:text-red-600" title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={pagination.prevPage}
                  disabled={!pagination.hasPrevPage}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={pagination.nextPage}
                  disabled={!pagination.hasNextPage}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Notifications;
