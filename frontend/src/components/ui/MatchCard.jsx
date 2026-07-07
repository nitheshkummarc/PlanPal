import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserGroupIcon, HeartIcon } from '@heroicons/react/24/outline';

const MatchCard = ({ match, index, className = "" }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/matches');
  };

  return (
    <div 
      className={`flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer group ${className}`}
      onClick={handleClick}
    >
      {/* Match Avatar/Icon */}
      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
        <UserGroupIcon className="h-5 w-5 text-white" />
      </div>

      {/* Match Details */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 dark:text-white text-base truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
          {match.matched_user_name || `User ${index + 1}`}
        </div>
        
        {/* Common Interests */}
        <div className="flex flex-wrap gap-1 mt-2">
          {match.common_interests && match.common_interests.slice(0, 3).map((interest, idx) => (
            <span 
              key={idx} 
              className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs rounded-full"
            >
              {interest}
            </span>
          ))}
          {match.common_interests && match.common_interests.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">
              +{match.common_interests.length - 3} more
            </span>
          )}
        </div>

        {/* Additional Info */}
        {match.mutual_friends !== undefined && (
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
            <HeartIcon className="h-3 w-3" />
            <span>{match.mutual_friends} mutual connections</span>
          </div>
        )}
      </div>

      {/* Match Score */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
          {match.score || Math.floor(Math.random() * 30) + 70}%
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          match
        </div>
      </div>
    </div>
  );
};

export default MatchCard;