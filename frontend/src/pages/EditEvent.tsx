import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CalendarDaysIcon,
  MapPinIcon,
  UsersIcon,
  ChevronLeftIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import { eventsApi } from '../api/eventsApi';
import { tagsApi } from '../api/tagsApi';
import { LoadingSpinner, LoadingButton } from '../components/ui/Loading';
import TagChip from '../components/ui/TagChip';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const EditEvent = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    timestamp: '',
    place: '',
    location: '',
    city: '',
    state: '',
    max_participants: '',
    is_paid: false,
    price: '',
    source_type: 'text',
    tag_ids: [] as string[]
  });

  const categories = [
    'Technology', 'Sports', 'Music', 'Art', 'Food', 'Education',
    'Business', 'Health', 'Gaming', 'Travel', 'Social', 'Other'
  ];

  useEffect(() => {
    if (eventId) {
      loadEventData();
      loadTags();
    }
  }, [eventId]);

  const loadEventData = async () => {
    try {
      setLoading(true);
      const response = await eventsApi.getEventDetails(eventId!);
      const event = (response as any).event || response;

      if (user?.user_id !== event.posted_by && user?.user_id !== event.created_by?.user_id) {
        toast.error('You can only edit your own events');
        navigate('/events');
        return;
      }

      const timestamp = event.timestamp ? new Date(event.timestamp).toISOString().slice(0, 16) : '';

      setFormData({
        title: event.title || '',
        description: event.description || '',
        timestamp: timestamp,
        place: event.place || '',
        location: event.location || '',
        city: event.city || '',
        state: event.state || '',
        max_participants: event.max_participants || '',
        is_paid: event.is_paid || false,
        price: event.price || '',
        source_type: event.source_type || 'text',
        tag_ids: event.tags ? event.tags.map((tag: any) => tag.tag_id) : []
      });
    } catch (error) {
      console.error('Failed to load event:', error);
      toast.error('Failed to load event details');
      navigate('/events');
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      const response = await tagsApi.getAllTags();
      setAvailableTags((response as any).tags || []);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleTagToggle = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      tag_ids: prev.tag_ids.includes(tagId)
        ? prev.tag_ids.filter(id => id !== tagId)
        : [...prev.tag_ids, tagId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!formData.timestamp) {
      toast.error('Date and time are required');
      return;
    }
    if (!formData.place.trim()) {
      toast.error('Venue name is required');
      return;
    }
    if (!formData.location.trim()) {
      toast.error('Location is required');
      return;
    }
    if (!formData.city.trim()) {
      toast.error('City is required');
      return;
    }
    if (!formData.state.trim()) {
      toast.error('State is required');
      return;
    }

    if (formData.is_paid && (!formData.price || parseFloat(formData.price) <= 0)) {
      toast.error('Price is required for paid events');
      return;
    }

    try {
      setSaving(true);

      const eventData = {
        ...formData,
        max_participants: formData.max_participants ? parseInt(formData.max_participants) : undefined,
        price: formData.is_paid ? parseFloat(formData.price) : undefined
      };

      await eventsApi.updateEvent(eventId!, eventData);
      toast.success('Event updated successfully!');
      navigate(`/events/${eventId}`);

    } catch (error: any) {
      console.error('Failed to update event:', error);
      toast.error(error.response?.data?.error || 'Failed to update event');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
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
          Back to Event
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Edit Event
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Update your event details
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Give your event a great title"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="input-field"
                  placeholder="Tell people what your event is about..."
                />
              </div>
            </div>

            <div>
              <label htmlFor="timestamp" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date and Time *
              </label>
              <div className="relative">
                <CalendarDaysIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="datetime-local"
                  id="timestamp"
                  name="timestamp"
                  value={formData.timestamp}
                  onChange={handleChange}
                  className="pl-10 input-field"
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Location Details</h3>

              <div>
                <label htmlFor="place" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Venue Name *
                </label>
                <div className="relative">
                  <MapPinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    id="place"
                    name="place"
                    value={formData.place}
                    onChange={handleChange}
                    className="pl-10 input-field"
                    placeholder="e.g., Central Park, Conference Hall A"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Street Address *
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Full street address"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="e.g., New York"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="e.g., NY"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="max_participants" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Max Participants
                </label>
                <div className="relative">
                  <UsersIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    id="max_participants"
                    name="max_participants"
                    value={formData.max_participants}
                    onChange={handleChange}
                    className="pl-10 input-field"
                    placeholder="e.g., 50"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 flex flex-col gap-2 shadow-sm">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_paid"
                      name="is_paid"
                      checked={formData.is_paid}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="is_paid" className="text-gray-700 dark:text-gray-200 text-sm font-medium select-none">
                      Paid Event
                    </label>
                  </div>
                  {formData.is_paid && (
                    <div className="mt-2">
                      <label htmlFor="price" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Amount (₹)
                      </label>
                      <input
                        type="number"
                        id="price"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="Enter amount"
                        min="1"
                        step="0.01"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {availableTags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tags (Select relevant topics)
                </label>

                {formData.tag_ids.length > 0 && (
                  <div className="mb-3">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Selected tags ({formData.tag_ids.length}):
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.tag_ids.map((tagId) => {
                        const tag = availableTags.find(t => t.tag_id === tagId);
                        return tag ? (
                          <TagChip
                            key={tag.tag_id}
                            tag={tag}
                            onRemove={() => handleTagToggle(tag.tag_id)}
                            removable
                          />
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3">
                  <div className="flex flex-wrap gap-2">
                    {availableTags.filter(tag => !formData.tag_ids.includes(tag.tag_id)).map((tag) => (
                      <button
                        key={tag.tag_id}
                        type="button"
                        onClick={() => handleTagToggle(tag.tag_id)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-800 dark:hover:text-blue-200 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                        title={`Click to add ${tag.name} tag`}
                      >
                        <TagIcon className="h-3 w-3" />
                        {tag.name}
                      </button>
                    ))}
                    {availableTags.filter(tag => !formData.tag_ids.includes(tag.tag_id)).length === 0 && (
                      <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                        All available tags have been selected
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn-secondary"
              >
                Cancel
              </button>

              <LoadingButton
                type="submit"
                loading={saving}
                className="btn-primary"
              >
                Update Event
              </LoadingButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditEvent;
