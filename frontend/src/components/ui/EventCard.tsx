import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDaysIcon, CurrencyRupeeIcon, MapPinIcon, UsersIcon } from '@heroicons/react/24/outline';
import { formatDate, formatTime } from '../../utils/dateUtils';
import { formatPrice } from '../../utils/helpers';
import type { AppEvent } from '../../types';

interface EventCardProps {
  event: AppEvent;
}

const EventCard = ({ event }: EventCardProps) => {
  const navigate = useNavigate();
  const isPast = new Date(event.timestamp) < new Date();

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
      onClick={() => navigate(`/events/${event.event_id}`)}
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2 flex-1 mr-2">
            {event.title}
          </h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
            isPast
              ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
              : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
          }`}>
            {isPast ? 'past' : 'upcoming'}
          </span>
        </div>

        {event.description && (
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">{event.description}</p>
        )}

        <div className="space-y-2">
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <CalendarDaysIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{formatDate(event.timestamp)} · {formatTime(event.timestamp)}</span>
          </div>

          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <MapPinIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">{event.place}, {event.city}, {event.state}</span>
          </div>

          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <UsersIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>
              {event.current_participants}
              {event.max_participants !== null && ` / ${event.max_participants}`} participants
            </span>
          </div>

          <div className="flex items-center text-sm font-medium text-green-600 dark:text-green-400">
            <CurrencyRupeeIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{formatPrice(event)}</span>
          </div>
        </div>

        {event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-4">
            {event.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.tag_id}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
              >
                {tag.name}
              </span>
            ))}
            {event.tags.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                +{event.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        {event.creator_name && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Organised by {event.creator_name}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventCard;
