import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDaysIcon, ClockIcon, MapPinIcon, UserIcon } from '@heroicons/react/24/outline';
import { formatDate, formatTime } from '../../utils/dateUtils';
import type { AppEvent, AppUser } from '../../types';

interface UpcomingEventCardProps {
  event: AppEvent;
  user: AppUser | null;
}

const UpcomingEventCard = ({ event, user }: UpcomingEventCardProps) => {
  const navigate = useNavigate();
  const isOrganizer = event.posted_by === user?.user_id;

  return (
    <div
      className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer group"
      onClick={() => navigate(`/events/${event.event_id}`)}
    >
      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
        <CalendarDaysIcon className="h-5 w-5 text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 dark:text-white text-base truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {event.title}
        </h4>
        <div className="flex items-center gap-4 mt-1">
          <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
            <MapPinIcon className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{event.place}, {event.city}</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
            <ClockIcon className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{formatDate(event.timestamp)} • {formatTime(event.timestamp)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <div className={`text-sm font-medium px-3 py-1 rounded-lg ${
          isOrganizer
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
        }`}>
          {isOrganizer ? 'Organizing' : 'Joined'}
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <UserIcon className="h-3 w-3" />
          <span>{event.current_participants} joined</span>
        </div>
      </div>
    </div>
  );
};

export default UpcomingEventCard;
