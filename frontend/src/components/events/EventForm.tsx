/**
 * EventForm.tsx - The event form shared by Create Event and Edit Event, so both
 * validate and build the request in the same way.
 */

import React, { useEffect, useState } from 'react';
import { CalendarDaysIcon, MapPinIcon, TagIcon, UsersIcon } from '@heroicons/react/24/outline';
import { tagsApi } from '../../api/tagsApi';
import type { EventInput } from '../../api/eventsApi';
import { LoadingButton } from '../ui/Loading';
import TagChip from '../ui/TagChip';
import { LIMITS } from '../../utils/validators';
import type { AppTag } from '../../types';
import { toEventInput, validateEventForm, type EventFormValues } from './eventFormValues';

interface EventFormProps {
  initialValues: EventFormValues;
  submitLabel: string;
  onSubmit: (input: EventInput) => Promise<void>;
  onCancel: () => void;
}

const inputClass = (hasError: boolean) => `input-field ${hasError ? 'border-red-500 focus:ring-red-500' : ''}`;

const EventForm = ({ initialValues, submitLabel, onSubmit, onCancel }: EventFormProps) => {
  const [values, setValues] = useState<EventFormValues>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tags, setTags] = useState<AppTag[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    tagsApi.getAllTags().then(setTags).catch(() => setTags([]));
  }, []);

  const setField = <K extends keyof EventFormValues>(field: K, value: EventFormValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setField(name as keyof EventFormValues, value as never);
  };

  const toggleTag = (tagId: string) =>
    setField('tag_ids', values.tag_ids.includes(tagId)
      ? values.tag_ids.filter((id) => id !== tagId)
      : [...values.tag_ids, tagId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fieldErrors = validateEventForm(values);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(toEventInput(values));
    } finally {
      setSubmitting(false);
    }
  };

  const error = (field: keyof EventFormValues) =>
    errors[field] ? <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors[field]}</p> : null;

  const textField = (field: 'title' | 'place' | 'location' | 'city' | 'state', label: string, maxLength: number, placeholder: string) => (
    <div>
      <label htmlFor={field} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label} *</label>
      <input
        type="text" id={field} name={field} value={values[field]} onChange={handleChange}
        maxLength={maxLength} className={inputClass(!!errors[field])} placeholder={placeholder}
      />
      {error(field)}
    </div>
  );

  const selectedTags = tags.filter((tag) => values.tag_ids.includes(tag.tag_id));
  const unselectedTags = tags.filter((tag) => !values.tag_ids.includes(tag.tag_id));

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6" noValidate>
      {textField('title', 'Event Title', LIMITS.eventTitle, 'Enter event title')}

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description *</label>
        <textarea
          id="description" name="description" rows={4} value={values.description} onChange={handleChange}
          maxLength={LIMITS.eventDescription} className={inputClass(!!errors.description)} placeholder="Describe your event"
        />
        {error('description')}
      </div>

      <div>
        <label htmlFor="date_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date &amp; Time *</label>
        <div className="relative">
          <CalendarDaysIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="datetime-local" id="date_time" name="date_time" value={values.date_time} onChange={handleChange}
            className={`pl-10 ${inputClass(!!errors.date_time)}`}
          />
        </div>
        {error('date_time')}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox" id="is_paid" checked={values.is_paid}
            onChange={(e) => setField('is_paid', e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
          <label htmlFor="is_paid" className="text-sm font-medium text-gray-700 dark:text-gray-300">This is a paid event</label>
        </div>
        {values.is_paid && (
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price (₹) *</label>
            <input
              type="number" id="price" name="price" value={values.price} onChange={handleChange}
              min="0.01" step="0.01" className={inputClass(!!errors.price)} placeholder="e.g. 500"
            />
            {error('price')}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Address *</label>
        <div className="relative">
          <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text" id="location" name="location" value={values.location} onChange={handleChange}
            maxLength={LIMITS.place} className={`pl-10 ${inputClass(!!errors.location)}`} placeholder="Complete address"
          />
        </div>
        {error('location')}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {textField('place', 'Venue/Place', LIMITS.place, 'e.g. Community Center')}
        {textField('city', 'City', LIMITS.city, 'City')}
        {textField('state', 'State', LIMITS.city, 'State')}
      </div>

      <div className="md:w-1/2">
        <label htmlFor="max_participants" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Participants</label>
        <div className="relative">
          <UsersIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="number" id="max_participants" name="max_participants" value={values.max_participants}
            onChange={handleChange} min="1" step="1" className={`pl-10 ${inputClass(!!errors.max_participants)}`}
            placeholder="Leave empty for no limit"
          />
        </div>
        {error('max_participants')}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tags</label>
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {selectedTags.map((tag) => (
              <TagChip key={tag.tag_id} tag={tag} removable onRemove={() => toggleTag(tag.tag_id)} />
            ))}
          </div>
        )}
        <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3">
          <div className="flex flex-wrap gap-2">
            {unselectedTags.map((tag) => (
              <button
                key={tag.tag_id}
                type="button"
                onClick={() => toggleTag(tag.tag_id)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-800 dark:hover:text-blue-200 transition-colors"
              >
                <TagIcon className="h-3 w-3" />
                {tag.name}
              </button>
            ))}
            {unselectedTags.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                {tags.length === 0 ? 'No tags available' : 'All tags selected'}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
        <LoadingButton type="submit" loading={submitting} className="btn-primary">{submitLabel}</LoadingButton>
      </div>
    </form>
  );
};

export default EventForm;
