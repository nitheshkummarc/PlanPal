import React from 'react';
import { Link } from 'react-router-dom';
import { UserIcon } from '@heroicons/react/24/outline';
import TagChip from './TagChip';
import type { AppUser } from '../../types';

const MAX_INTERESTS_SHOWN = 3;

/** A person in search results; links to their profile. */
const UserCard = ({ user }: { user: AppUser }) => {
  const extraInterests = user.interests.length - MAX_INTERESTS_SHOWN;

  return (
    <Link
      to={`/users/${user.user_id}`}
      className="block bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
          {user.profile_image_url ? (
            <img src={user.profile_image_url} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <UserIcon className="h-8 w-8 text-gray-400" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white text-lg truncate">{user.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">@{user.username}</p>

          {user.bio && (
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">{user.bio}</p>
          )}

          {user.interests.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {user.interests.slice(0, MAX_INTERESTS_SHOWN).map((tag) => (
                <TagChip key={tag.tag_id} tag={tag} size="sm" />
              ))}
              {extraInterests > 0 && (
                <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">+{extraInterests} more</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default UserCard;
