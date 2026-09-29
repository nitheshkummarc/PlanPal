/**
 * UserProfile.tsx - Another user's profile (/users/:id), opened from search results
 * and participant lists. Other users' email addresses are never returned by the API.
 */

import React, { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  UserIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { usersApi } from '../api/usersApi';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/ui/Loading';
import TagChip from '../components/ui/TagChip';
import { formatDate } from '../utils/dateUtils';

const UserProfile = () => {
  const { id: userId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const { data: profile, loading, error, execute: fetchUser } = useApi(usersApi.getUserProfile, { showErrorToast: false });

  useEffect(() => {
    if (userId) {
      fetchUser(userId).catch(() => undefined); // the error state is rendered below
    }
  }, [userId, fetchUser]);
  const isOwnProfile = !!profile && currentUser?.user_id === profile.user_id;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-12">
          <ExclamationTriangleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">User not found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            This profile doesn't exist or is no longer active.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ChevronLeftIcon className="h-5 w-5" />
          Back
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
              {profile.profile_image_url ? (
                <img src={profile.profile_image_url} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <UserIcon className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </div>

            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{profile.name}</h1>
              <p className="text-gray-600 dark:text-gray-400 mb-2">@{profile.username}</p>
              {profile.bio && (
                <p className="text-gray-700 dark:text-gray-300 mb-3 whitespace-pre-line">{profile.bio}</p>
              )}
              {profile.created_at && (
                <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                  <CalendarDaysIcon className="h-4 w-4" />
                  Joined {formatDate(profile.created_at)}
                </div>
              )}
            </div>

            {isOwnProfile && (
              <Link to="/profile" className="btn-secondary">
                Edit your profile
              </Link>
            )}
          </div>

          {profile.interests.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Interests</h2>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((tag) => <TagChip key={tag.tag_id} tag={tag} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
