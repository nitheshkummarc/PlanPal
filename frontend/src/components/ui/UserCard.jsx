import React from 'react';
import { Link } from 'react-router-dom';
import { 
  UserIcon, 
  MapPinIcon, 
  CalendarDaysIcon,
  CheckBadgeIcon,
  ChatBubbleLeftIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import TagChip from './TagChip';

const UserCard = ({ 
  user, 
  showActions = true, 
  compact = false,
  variant = 'default', // default, match, suggestion
  onConnect,
  onMessage,
  onLike
}) => {
  const {
    id,
    name,
    bio,
    location,
    interests = [],
    profile_picture,
    is_verified,
    mutual_friends_count,
    common_interests = [],
    last_active,
    match_score,
    is_connected,
    is_pending
  } = user;

  const handleConnect = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onConnect) {
      onConnect(user);
    }
  };

  const handleMessage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onMessage) {
      onMessage(user);
    }
  };

  const handleLike = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onLike) {
      onLike(user);
    }
  };

  const getStatusColor = () => {
    if (!last_active) return 'gray';
    const lastActiveDate = new Date(last_active);
    const now = new Date();
    const diffHours = (now - lastActiveDate) / (1000 * 60 * 60);
    
    if (diffHours < 1) return 'green';
    if (diffHours < 24) return 'yellow';
    return 'gray';
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden ${compact ? 'h-auto' : ''}`}>
      <Link to={`/users/${id}`} className="block">
        {/* Header with profile picture and basic info */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Profile Picture */}
            <div className="relative">
              <div className={`${compact ? 'w-12 h-12' : 'w-16 h-16'} rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden`}>
                {profile_picture ? (
                  <img
                    src={profile_picture}
                    alt={name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UserIcon className={`${compact ? 'h-6 w-6' : 'h-8 w-8'} text-gray-400`} />
                  </div>
                )}
              </div>
              
              {/* Online status indicator */}
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${
                getStatusColor() === 'green' ? 'bg-green-500' :
                getStatusColor() === 'yellow' ? 'bg-yellow-500' : 'bg-gray-400'
              }`}></div>
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`font-semibold text-gray-900 dark:text-white ${compact ? 'text-sm' : 'text-lg'} truncate`}>
                  {name}
                </h3>
                {is_verified && (
                  <CheckBadgeIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />
                )}
              </div>

              {/* Match Score (for match variant) */}
              {variant === 'match' && match_score && (
                <div className="mb-2">
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    {Math.round(match_score)}% Match
                  </span>
                </div>
              )}

              {/* Location */}
              {location && (
                <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm mb-2">
                  <MapPinIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span className="truncate">{location}</span>
                </div>
              )}

              {/* Bio */}
              {bio && !compact && (
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                  {bio}
                </p>
              )}

              {/* Mutual Friends */}
              {mutual_friends_count > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  {mutual_friends_count} mutual friend{mutual_friends_count !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* Like button for match variant */}
            {variant === 'match' && onLike && (
              <button
                onClick={handleLike}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <HeartIcon className="h-5 w-5 text-gray-400 hover:text-red-500" />
              </button>
            )}
          </div>

          {/* Interests/Tags */}
          {(interests.length > 0 || common_interests.length > 0) && (
            <div className="mt-3">
              <div className="flex flex-wrap gap-1">
                {/* Show common interests first for match variant */}
                {variant === 'match' && common_interests.length > 0 && (
                  <>
                    {common_interests.slice(0, compact ? 2 : 3).map((interest) => (
                      <TagChip key={interest.id} tag={interest} size="sm" variant="success" />
                    ))}
                  </>
                )}
                
                {/* Regular interests */}
                {interests.slice(0, compact ? (common_interests.length > 0 ? 1 : 2) : (common_interests.length > 0 ? 2 : 3)).map((interest) => (
                  <TagChip key={interest.id} tag={interest} size="sm" />
                ))}
                
                {/* Show +more indicator */}
                {(interests.length + common_interests.length) > (compact ? 2 : 3) && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
                    +{(interests.length + common_interests.length) - (compact ? 2 : 3)} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </Link>

      {/* Action Buttons */}
      {showActions && (
        <div className="px-4 pb-4 flex gap-2">
          {is_connected ? (
            <button
              onClick={handleMessage}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <ChatBubbleLeftIcon className="h-4 w-4" />
              Message
            </button>
          ) : is_pending ? (
            <button
              disabled
              className="flex-1 bg-gray-400 text-white py-2 px-4 rounded-lg text-sm font-medium cursor-not-allowed"
            >
              Request Sent
            </button>
          ) : (
            <button
              onClick={handleConnect}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
            >
              Connect
            </button>
          )}
          
          {variant !== 'match' && onMessage && is_connected && (
            <button
              onClick={handleMessage}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <ChatBubbleLeftIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default UserCard;
