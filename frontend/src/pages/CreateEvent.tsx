import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDaysIcon,
  MapPinIcon,
  UsersIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import { eventsApi } from '../api/eventsApi';
import { tagsApi } from '../api/tagsApi';
import { LoadingButton } from '../components/ui/Loading';
import TagChip from '../components/ui/TagChip';
import { useApi } from '../hooks/useApi';
import { validateForm, eventSchema } from '../utils/validators';
import toast from 'react-hot-toast';

const CreateEvent = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date_time: '',
    location: '',
    city: '',
    state: '',
    place: '',
    max_participants: '',
    category: '',
    is_paid: false,
    price: ''
  });

  const [selectedTags, setSelectedTags] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: tagsData,
    loading: tagsLoading,
    execute: fetchTags
  } = useApi(tagsApi.getAllTags);

  useEffect(() => {
    fetchTags();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;

    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleTagToggle = (tag: any) => {
    setSelectedTags(prev => {
      const isSelected = prev.find(t => t.tag_id === tag.tag_id);
      if (isSelected) {
        return prev.filter(t => t.tag_id !== tag.tag_id);
      } else {
        return [...prev, tag];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateForm(formData, eventSchema);
    if (!validation.isValid) {
      setErrors(validation.errors as any as Record<string, string>);
      toast.error('Please fix the errors below');
      return;
    }

    try {
      setIsSubmitting(true);

      let timestamp = formData.date_time;
      if (timestamp && !timestamp.endsWith('Z')) {
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(timestamp)) {
          timestamp = timestamp + ':00';
        }
        const dt = new Date(timestamp);
        timestamp = dt.toISOString();
      }

      const eventData = {
        title: formData.title,
        description: formData.description,
        timestamp,
        place: formData.place || formData.location,
        location: formData.location,
        city: formData.city,
        state: formData.state,
        source_type: 'text',
        is_paid: formData.is_paid || false,
        price: formData.is_paid && formData.price ? parseFloat(formData.price) : undefined,
        max_participants: formData.max_participants ? parseInt(formData.max_participants) : undefined,
        tag_ids: selectedTags.map(tag => tag.tag_id)
      };

      const response = await eventsApi.createEvent(eventData);

      toast.success('Event created successfully!');

      localStorage.setItem('eventUpdated', Date.now().toString());

      navigate(`/events/${(response as any).event.event_id}`);

    } catch (error: any) {
      console.error('Failed to create event:', error);
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to create event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    'Technology', 'Sports', 'Music', 'Art', 'Food', 'Business',
    'Education', 'Health', 'Travel', 'Entertainment', 'Other'
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Create Event
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Fill in the details below to create a new event
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Event Details
            </h2>

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
                className={`input-field ${errors.title ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="Enter event title"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                className={`input-field ${errors.description ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="Describe your event"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
              )}
            </div>

            <div>
              <label htmlFor="date_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date & Time *
              </label>
              <div className="relative">
                <CalendarDaysIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="datetime-local"
                  id="date_time"
                  name="date_time"
                  value={formData.date_time}
                  onChange={handleChange}
                  className={`pl-10 input-field ${errors.date_time ? 'border-red-500 focus:ring-red-500' : ''}`}
                />
              </div>
              {errors.date_time && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.date_time}</p>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_paid"
                  name="is_paid"
                  checked={formData.is_paid}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <label htmlFor="is_paid" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  This is a paid event
                </label>
              </div>

              {formData.is_paid && (
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Event Price (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">₹</span>
                    <input
                      type="number"
                      id="price"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      className="pl-8 input-field"
                      placeholder="e.g., 500"
                      min="0"
                      step="0.01"
                      required={formData.is_paid}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Address *
              </label>
              <div className="relative">
                <MapPinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className={`pl-10 input-field ${errors.location ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="Complete address"
                />
              </div>
              {errors.location && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.location}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="place" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Venue/Place *
                </label>
                <input
                  type="text"
                  id="place"
                  name="place"
                  value={formData.place}
                  onChange={handleChange}
                  className={`input-field ${errors.place ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="e.g., Community Center"
                />
                {errors.place && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.place}</p>
                )}
              </div>

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
                  className={`input-field ${errors.city ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="City"
                />
                {errors.city && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.city}</p>
                )}
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
                  className={`input-field ${errors.state ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="State"
                />
                {errors.state && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.state}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags
              </label>

              {selectedTags.length > 0 && (
                <div className="mb-3">
                  <div className="flex flex-wrap gap-2">
                  {selectedTags.map(tag => (
                    <TagChip
                      key={tag.tag_id}
                      tag={tag}
                      removable
                      onRemove={() => handleTagToggle(tag)}
                    />
                  ))}
                  </div>
                </div>
              )}

              {!tagsLoading && (tagsData as any)?.tags && (
                <div>
                  <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3">
                    <div className="flex flex-wrap gap-2">
                      {(tagsData as any).tags.filter((tag: any) => !selectedTags.find(st => st.tag_id === tag.tag_id)).map((tag: any) => (
                        <button
                          key={tag.tag_id}
                          type="button"
                          onClick={() => handleTagToggle(tag)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-800 dark:hover:text-blue-200 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                          title={`Click to add ${tag.name} tag`}
                        >
                          <TagIcon className="h-3 w-3" />
                          {tag.name}
                        </button>
                      ))}
                      {(tagsData as any).tags.filter((tag: any) => !selectedTags.find(st => st.tag_id === tag.tag_id)).length === 0 && (
                        <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                          All available tags have been selected
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {tagsLoading && (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">Loading tags...</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => navigate('/events')}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <LoadingButton
                type="submit"
                loading={isSubmitting}
                className="btn-primary"
              >
                Create Event
              </LoadingButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateEvent;
