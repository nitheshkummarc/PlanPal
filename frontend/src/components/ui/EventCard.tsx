import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';
import { formatPrice } from '../../utils/helpers';
import type { AppEvent } from '../../types';

interface EventTag {
  name: string;
}

interface EventCreatedBy {
  name?: string;
  username?: string;
}

// Extended event shape — the card may receive extra fields from various API endpoints
interface EventCardEvent extends AppEvent {
  status?: string;
  date_time?: string;
  duration?: number;
  tags?: (string | EventTag)[];
  created_by?: EventCreatedBy;
  id?: string;
}

interface EventCardProps {
  event: EventCardEvent;
  onClick?: (event: EventCardEvent) => void;
}

const EventCard = ({ event, onClick }: EventCardProps) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    if (onClick) {
      onClick(event);
    } else {
      navigate(`/events/${event.event_id || event.id}`);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'upcoming':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'ongoing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'completed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const isPast = (event.timestamp || event.date_time) ? new Date(event.timestamp || event.date_time || '') < new Date() : false;
  const displayStatus = isPast ? 'completed' : (event.status || 'upcoming');

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
      onClick={handleCardClick}
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2 flex-1 mr-2">
            {event.title}
          </h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(displayStatus)}`}>
            {displayStatus}
          </span>
        </div>

        {event.description && (
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
            {event.description}
          </p>
        )}

        <div className="space-y-2">
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{formatDate(event.timestamp || event.date_time || '')}</span>
          </div>

          {(event.location || event.place) && (
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">
                {event.place && event.location ? `${event.place}, ${event.location}` : event.location || event.place}
                {event.city && event.state && `, ${event.city}, ${event.state}`}
              </span>
            </div>
          )}

          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Users className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>
              {event.current_participants || 0}
              {event.max_participants && ` / ${event.max_participants}`} participants
            </span>
          </div>

          {event.duration && (
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>{event.duration} minutes</span>
            </div>
          )}

          {event.is_paid && event.price && (
            <div className="flex items-center text-sm text-green-600 dark:text-green-400 font-medium">
              <span className="mr-1">💰</span>
              <span>{formatPrice(event.price)}</span>
            </div>
          )}
        </div>

        {event.tags && event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-4">
            {event.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
              >
                {typeof tag === 'string' ? tag : tag.name}
              </span>
            ))}
            {event.tags.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                +{event.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        {event.created_by && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Created by {event.created_by.name || event.created_by.username}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventCard;
