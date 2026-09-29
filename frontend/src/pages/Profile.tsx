import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellIcon, CalendarDaysIcon, KeyIcon, PencilIcon, UserIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { tagsApi } from '../api/tagsApi';
import { LoadingButton } from '../components/ui/Loading';
import TagChip from '../components/ui/TagChip';
import { formatDate } from '../utils/dateUtils';
import { LIMITS, PASSWORD_MESSAGE, profileSchema, validateForm, validatePassword } from '../utils/validators';
import type { AppTag, AppUser } from '../types';

type Tab = 'profile' | 'security' | 'notifications';

const TABS: { id: Tab; name: string; icon: typeof UserIcon }[] = [
  { id: 'profile', name: 'Profile', icon: UserIcon },
  { id: 'security', name: 'Security', icon: KeyIcon },
  { id: 'notifications', name: 'Notifications', icon: BellIcon },
];

const emptyPasswords = { current_password: '', new_password: '', confirm_password: '' };

const profileFormFrom = (user: AppUser | null) => ({
  name: user?.name ?? '',
  username: user?.username ?? '',
  bio: user?.bio ?? '',
  profile_image_url: user?.profile_image_url ?? '',
});

const Profile = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState(profileFormFrom(user));
  const [interests, setInterests] = useState<AppTag[]>(user?.interests ?? []);
  const [passwordData, setPasswordData] = useState(emptyPasswords);
  const [availableTags, setAvailableTags] = useState<AppTag[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    tagsApi.getAllTags().then(setAvailableTags).catch(() => setAvailableTags([]));
  }, []);

  const startEditing = () => {
    setProfileData(profileFormFrom(user));
    setInterests(user?.interests ?? []);
    setErrors({});
    setIsEditing(true);
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const toggleInterest = (tag: AppTag) =>
    setInterests((prev) =>
      prev.some((t) => t.tag_id === tag.tag_id) ? prev.filter((t) => t.tag_id !== tag.tag_id) : [...prev, tag]
    );

  const handleProfileSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const validation = validateForm(profileData, profileSchema);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    setIsUpdating(true);
    const result = await updateProfile({
      name: profileData.name.trim(),
      username: profileData.username,
      bio: profileData.bio,
      profile_image_url: profileData.profile_image_url.trim(),
      interest_tag_ids: interests.map((tag) => tag.tag_id),
    });
    setIsUpdating(false);
    if (result.success) setIsEditing(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePassword(passwordData.new_password)) {
      setErrors({ new_password: PASSWORD_MESSAGE });
      return;
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      setErrors({ confirm_password: 'Passwords do not match' });
      return;
    }
    setIsUpdating(true);
    const result = await changePassword({
      current_password: passwordData.current_password,
      new_password: passwordData.new_password,
    });
    setIsUpdating(false);
    if (result.success) setPasswordData(emptyPasswords);
  };

  const fieldError = (field: string) =>
    errors[field] ? <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors[field]}</p> : null;
  const readOnlyClass = !isEditing ? 'bg-gray-50 dark:bg-gray-700' : '';
  const unselectedTags = availableTags.filter((tag) => !interests.some((t) => t.tag_id === tag.tag_id));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your profile, interests and password</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
              {(isEditing ? profileData.profile_image_url : user?.profile_image_url) ? (
                <img
                  src={isEditing ? profileData.profile_image_url : user?.profile_image_url ?? ''}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <UserIcon className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{user?.name}</h2>
                {!isEditing && (
                  <button onClick={startEditing} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Edit profile">
                    <PencilIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-2">@{user?.username}</p>
              {user?.bio && <p className="text-gray-700 dark:text-gray-300 mb-3">{user.bio}</p>}
              {user?.created_at && (
                <p className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                  <CalendarDaysIcon className="h-4 w-4" />
                  Joined {formatDate(user.created_at)}
                </p>
              )}
            </div>
          </div>

          {user && user.interests.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Interests</h3>
              <div className="flex flex-wrap gap-2">
                {user.interests.map((tag) => <TagChip key={tag.tag_id} tag={tag} size="sm" />)}
              </div>
            </div>
          )}
        </div>

        <nav className="flex space-x-8 mb-8" aria-label="Profile sections">
          {TABS.map((tab) => (
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

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Information</h3>
                {isEditing ? (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => { setIsEditing(false); setErrors({}); }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <LoadingButton type="submit" loading={isUpdating} className="btn-primary">Save Changes</LoadingButton>
                  </div>
                ) : (
                  <button type="button" onClick={startEditing} className="btn-secondary">Edit Profile</button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                  <input id="name" type="text" name="name" maxLength={LIMITS.name}
                    value={isEditing ? profileData.name : user?.name ?? ''} onChange={handleProfileChange}
                    disabled={!isEditing} className={`input-field ${readOnlyClass} ${errors.name ? 'border-red-500' : ''}`} />
                  {fieldError('name')}
                </div>
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                  <input id="username" type="text" name="username"
                    value={isEditing ? profileData.username : user?.username ?? ''} onChange={handleProfileChange}
                    disabled={!isEditing} className={`input-field ${readOnlyClass} ${errors.username ? 'border-red-500' : ''}`} />
                  {fieldError('username')}
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input id="email" type="email" value={user?.email ?? ''} disabled className="input-field bg-gray-50 dark:bg-gray-700" />
                {isEditing && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Email is your sign-in identity and can't be changed.</p>}
              </div>

              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
                <textarea id="bio" name="bio" rows={3} maxLength={LIMITS.bio}
                  value={isEditing ? profileData.bio : user?.bio ?? ''} onChange={handleProfileChange}
                  disabled={!isEditing} className={`input-field ${readOnlyClass} ${errors.bio ? 'border-red-500' : ''}`}
                  placeholder="Tell us about yourself" />
                {fieldError('bio')}
              </div>

              {isEditing && (
                <>
                  <div>
                    <label htmlFor="profile_image_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Profile image URL</label>
                    <input id="profile_image_url" type="url" name="profile_image_url" maxLength={LIMITS.url}
                      value={profileData.profile_image_url} onChange={handleProfileChange}
                      className={`input-field ${errors.profile_image_url ? 'border-red-500' : ''}`}
                      placeholder="https://example.com/photo.jpg" />
                    {fieldError('profile_image_url')}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Interests</label>
                    {interests.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {interests.map((tag) => (
                          <TagChip key={tag.tag_id} tag={tag} removable onRemove={() => toggleInterest(tag)} />
                        ))}
                      </div>
                    )}
                    <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3 flex flex-wrap gap-2">
                      {unselectedTags.map((tag) => (
                        <button
                          key={tag.tag_id}
                          type="button"
                          onClick={() => toggleInterest(tag)}
                          className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-800 dark:hover:text-blue-200 transition-colors"
                        >
                          {tag.name}
                        </button>
                      ))}
                      {unselectedTags.length === 0 && (
                        <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                          {availableTags.length === 0 ? 'No tags available' : 'All tags selected'}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </form>
          )}

          {activeTab === 'security' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Change Password</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Changing your password signs you out on every other device.</p>
              <form onSubmit={handlePasswordSubmit} className="space-y-6 max-w-md">
                {([
                  ['current_password', 'Current Password'],
                  ['new_password', 'New Password'],
                  ['confirm_password', 'Confirm New Password'],
                ] as const).map(([field, label]) => (
                  <div key={field}>
                    <label htmlFor={field} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                    <input
                      id={field}
                      type="password"
                      name={field}
                      value={passwordData[field]}
                      onChange={(e) => {
                        setPasswordData((prev) => ({ ...prev, [field]: e.target.value }));
                        setErrors((prev) => ({ ...prev, [field]: '' }));
                      }}
                      className={`input-field ${errors[field] ? 'border-red-500' : ''}`}
                    />
                    {fieldError(field)}
                  </div>
                ))}
                <p className="text-xs text-gray-500 dark:text-gray-400">{PASSWORD_MESSAGE}</p>
                <LoadingButton type="submit" loading={isUpdating} className="btn-primary">Change Password</LoadingButton>
              </form>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Notifications</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">PlanPal sends in-app notifications (the bell in the navbar) when:</p>
              <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-400 mb-6">
                <li>someone joins or leaves an event you organise</li>
                <li>an event you joined is updated or cancelled</li>
                <li>an event you organise or joined starts within 24 hours</li>
              </ul>
              <Link to="/notifications" className="btn-primary">View notifications</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
