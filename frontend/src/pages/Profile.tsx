import React, { useState, useEffect } from 'react';
import {
  UserIcon,
  CameraIcon,
  PencilIcon,
  CalendarDaysIcon,
  KeyIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { LoadingButton } from '../components/ui/Loading';
import TagChip from '../components/ui/TagChip';
import { tagsApi } from '../api/tagsApi';
import { useApi } from '../hooks/useApi';
import { validateForm, profileSchema } from '../utils/validators';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    username: '',
    email: '',
    bio: '',
    profile_picture: null as File | null
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [selectedInterests, setSelectedInterests] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);

  const {
    data: tagsData,
    loading: tagsLoading,
    execute: fetchTags
  } = useApi(tagsApi.getAllTags);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        username: user.username || '',
        email: user.email || '',
        bio: user.bio || '',
        profile_picture: null
      });

      const userPreferences = user.preferences || (user as any).interests || [];

      if (userPreferences.length > 0 && typeof userPreferences[0] === 'string') {
        setSelectedInterests(userPreferences);
      } else {
        setSelectedInterests(userPreferences);
      }
    }
  }, [user]);

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    if ((tagsData as any)?.tags) {
      setAvailableTags((tagsData as any).tags);

      if (selectedInterests.length > 0 && typeof selectedInterests[0] === 'string') {
        const tagObjects = selectedInterests
          .map(tagName => (tagsData as any).tags.find((tag: any) => tag.name === tagName))
          .filter(tag => tag !== undefined);
        setSelectedInterests(tagObjects);
      }
    }
  }, [tagsData, selectedInterests]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'file') {
      const fileInput = e.target as HTMLInputElement;
      const file = fileInput.files?.[0];
      if (file) {
        setProfileData(prev => ({ ...prev, [name]: file }));
        const previewUrl = URL.createObjectURL(file);
        setProfilePreview(previewUrl);
      }
    } else {
      setProfileData(prev => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleInterestToggle = (tag: any) => {
    setSelectedInterests(prev => {
      const isSelected = prev.find(t => (t.tag_id || t.id) === (tag.tag_id || tag.id));
      if (isSelected) {
        return prev.filter(t => (t.tag_id || t.id) !== (tag.tag_id || tag.id));
      } else {
        return [...prev, tag];
      }
    });
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateForm(profileData, profileSchema);
    if (!validation.isValid) {
      setErrors(validation.errors as any as Record<string, string>);
      return;
    }

    try {
      setIsUpdating(true);

      const updateData = {
        name: profileData.name,
        username: profileData.username,
        bio: profileData.bio,
        preferences: selectedInterests.map(tag => tag.name)
      };

      if (profileData.profile_picture) {
        console.log('Image upload not implemented yet');
      }

      const result = await updateProfile(updateData);
      if (result.success) {
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Profile update error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.new_password !== passwordData.confirm_password) {
      setErrors({ confirm_password: 'Passwords do not match' });
      return;
    }

    try {
      setIsUpdating(true);

      const result = await changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });

      if (result.success) {
        setPasswordData({
          current_password: '',
          new_password: '',
          confirm_password: ''
        });
        toast.success('Password changed successfully!');
      }
    } catch (error) {
      toast.error('Failed to change password');
    } finally {
      setIsUpdating(false);
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: UserIcon },
    { id: 'security', name: 'Security', icon: KeyIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Profile
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your profile and preferences
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                {profilePreview ? (
                  <img src={profilePreview} alt="Profile preview" className="w-full h-full object-cover" />
                ) : user?.profile_image_url ? (
                  <img src={user.profile_image_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UserIcon className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>
              {isEditing && (
                <label htmlFor="profile_picture" className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700">
                  <CameraIcon className="h-4 w-4" />
                  <input
                    type="file"
                    id="profile_picture"
                    name="profile_picture"
                    accept="image/*"
                    onChange={handleProfileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user?.name || 'User'}
                </h2>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-2">@{user?.username}</p>
              {user?.bio && (
                <p className="text-gray-700 dark:text-gray-300 mb-3">{user.bio}</p>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <CalendarDaysIcon className="h-4 w-4" />
                  Joined {new Date(user?.created_at || Date.now()).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          {((user?.preferences && user.preferences.length > 0) || ((user as any)?.interests && (user as any).interests.length > 0)) && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Interests</h3>
              <div className="flex flex-wrap gap-2">
                {(user?.preferences || (user as any)?.interests || []).slice(0, 10).map((interest: any, index: number) => {
                  const tagData = typeof interest === 'string'
                    ? { name: interest, tag_id: index }
                    : interest;
                  return <TagChip key={index} tag={tagData} size="sm" />;
                })}
                {(user?.preferences || (user as any)?.interests || []).length > 10 && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    +{(user?.preferences || (user as any)?.interests).length - 10} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mb-8">
          <div className="sm:hidden">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
            >
              {tabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.name}
                </option>
              ))}
            </select>
          </div>
          <div className="hidden sm:block">
            <nav className="flex space-x-8" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
          {activeTab === 'profile' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Profile Information
                </h3>
                {isEditing ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setErrors({});
                        setProfileData({
                          name: user?.name || '',
                          username: user?.username || '',
                          email: user?.email || '',
                          bio: user?.bio || '',
                          profile_picture: null
                        });
                        setProfilePreview(null);
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <LoadingButton
                      onClick={handleProfileSubmit as any}
                      loading={isUpdating}
                      className="btn-primary"
                    >
                      Save Changes
                    </LoadingButton>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn-secondary"
                  >
                    Edit Profile
                  </button>
                )}
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={profileData.name}
                      onChange={handleProfileChange}
                      disabled={!isEditing}
                      className={`input-field ${!isEditing ? 'bg-gray-50 dark:bg-gray-700' : ''} ${errors.name ? 'border-red-500' : ''}`}
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={profileData.username}
                      onChange={handleProfileChange}
                      disabled={!isEditing}
                      className={`input-field ${!isEditing ? 'bg-gray-50 dark:bg-gray-700' : ''} ${errors.username ? 'border-red-500' : ''}`}
                    />
                    {errors.username && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.username}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={profileData.email}
                    onChange={handleProfileChange}
                    disabled={!isEditing}
                    className={`input-field ${!isEditing ? 'bg-gray-50 dark:bg-gray-700' : ''} ${errors.email ? 'border-red-500' : ''}`}
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bio
                  </label>
                  <textarea
                    name="bio"
                    rows={3}
                    value={profileData.bio}
                    onChange={handleProfileChange}
                    disabled={!isEditing}
                    className={`input-field ${!isEditing ? 'bg-gray-50 dark:bg-gray-700' : ''} ${errors.bio ? 'border-red-500' : ''}`}
                    placeholder="Tell us about yourself"
                  />
                  {errors.bio && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.bio}</p>}
                </div>

                {isEditing && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Interests
                    </label>

                    {selectedInterests.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {selectedInterests.map(tag => (
                          <TagChip
                            key={tag.tag_id || tag.id}
                            tag={tag}
                            removable
                            onRemove={() => handleInterestToggle(tag)}
                          />
                        ))}
                      </div>
                    )}

                    {!tagsLoading && availableTags.length > 0 && (
                      <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3">
                        <div className="flex flex-wrap gap-2">
                          {availableTags.filter(tag => !selectedInterests.find(st => (st.tag_id || st.id) === (tag.tag_id || tag.id))).map(tag => (
                            <button
                              key={tag.tag_id || tag.id}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleInterestToggle(tag);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-800 dark:hover:text-blue-200 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                              title={`Click to add ${tag.name} tag`}
                            >
                              {tag.name}
                            </button>
                          ))}
                          {availableTags.filter(tag => !selectedInterests.find(st => (st.tag_id || st.id) === (tag.tag_id || tag.id))).length === 0 && (
                            <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                              All available tags have been selected
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Change Password
              </h3>

              <form onSubmit={handlePasswordSubmit} className="space-y-6 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    name="current_password"
                    value={passwordData.current_password}
                    onChange={handlePasswordChange}
                    className={`input-field ${errors.current_password ? 'border-red-500' : ''}`}
                  />
                  {errors.current_password && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.current_password}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    name="new_password"
                    value={passwordData.new_password}
                    onChange={handlePasswordChange}
                    className={`input-field ${errors.new_password ? 'border-red-500' : ''}`}
                    placeholder="Must contain uppercase, lowercase, number, and special character"
                  />
                  {errors.new_password && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.new_password}</p>}
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Password must be at least 8 characters with uppercase, lowercase, number, and special character
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    name="confirm_password"
                    value={passwordData.confirm_password}
                    onChange={handlePasswordChange}
                    className={`input-field ${errors.confirm_password ? 'border-red-500' : ''}`}
                  />
                  {errors.confirm_password && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confirm_password}</p>}
                </div>

                <LoadingButton
                  type="submit"
                  loading={isUpdating}
                  className="btn-primary"
                >
                  Change Password
                </LoadingButton>
              </form>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Notification Settings
              </h3>

              <div className="space-y-6">
                <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                  <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4">
                    Email Notifications
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Event Reminders
                        </label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Get notified about upcoming events you've joined
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        className="toggle toggle-blue"
                        defaultChecked
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Event Updates
                        </label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Receive updates when event details change
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        className="toggle toggle-blue"
                        defaultChecked
                      />
                    </div>
                  </div>
                </div>

                <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                  <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4">
                    Push Notifications
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Real-time Updates
                        </label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Get instant notifications for important updates
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        className="toggle toggle-blue"
                        defaultChecked
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Event Participation
                        </label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Notifications when someone joins/leaves your events
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        className="toggle toggle-blue"
                        defaultChecked
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4">
                    Notification Frequency
                  </h4>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="frequency"
                        value="instant"
                        className="radio radio-blue mr-3"
                        defaultChecked
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Instant - Get notifications immediately
                      </span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="frequency"
                        value="daily"
                        className="radio radio-blue mr-3"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Daily Digest - Once per day summary
                      </span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="frequency"
                        value="weekly"
                        className="radio radio-blue mr-3"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Weekly Summary - Once per week
                      </span>
                    </label>
                  </div>
                </div>

                <div className="pt-6">
                  <button className="btn-primary">
                    Save Notification Settings
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Preferences
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Preference settings coming soon...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
