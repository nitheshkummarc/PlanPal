/**
 * eventFormValues.ts - Form state, validation and request building for the event form
 * (components/events/EventForm.tsx), kept separate so they can be unit tested.
 */

import type { EventInput } from '../../api/eventsApi';
import { localInputToISO, toLocalInputValue } from '../../utils/dateUtils';
import { eventSchema, validateCapacity, validateForm, validatePrice } from '../../utils/validators';
import type { AppEvent } from '../../types';

export interface EventFormValues {
  title: string;
  description: string;
  date_time: string;         // datetime-local value, local time
  place: string;
  location: string;
  city: string;
  state: string;
  max_participants: string;  // empty = no limit
  is_paid: boolean;
  price: string;
  tag_ids: string[];
}

export const emptyEventForm: EventFormValues = {
  title: '', description: '', date_time: '', place: '', location: '', city: '', state: '',
  max_participants: '', is_paid: false, price: '', tag_ids: [],
};

export const eventToFormValues = (event: AppEvent): EventFormValues => ({
  title: event.title,
  description: event.description ?? '',
  date_time: toLocalInputValue(event.timestamp),
  place: event.place,
  location: event.location,
  city: event.city,
  state: event.state,
  max_participants: event.max_participants === null ? '' : String(event.max_participants),
  is_paid: event.is_paid,
  price: event.price === null ? '' : String(event.price),
  tag_ids: event.tags.map((tag) => tag.tag_id),
});

/** Validate the form; returns field errors (empty when valid). */
export const validateEventForm = (values: EventFormValues): Record<string, string> => {
  const { errors } = validateForm({ ...values }, eventSchema);
  if (values.is_paid && !validatePrice(values.price)) {
    errors.price = 'Enter a price greater than 0 for a paid event';
  }
  if (!validateCapacity(values.max_participants)) {
    errors.max_participants = 'Max participants must be a whole number greater than 0';
  }
  return errors;
};

/** The request body for create/update. Clearing a field sends null so the server clears it. */
export const toEventInput = (values: EventFormValues): EventInput => ({
  title: values.title.trim(),
  description: values.description.trim() || null,
  timestamp: localInputToISO(values.date_time),
  place: values.place.trim(),
  location: values.location.trim(),
  city: values.city.trim(),
  state: values.state.trim(),
  is_paid: values.is_paid,
  price: values.is_paid ? Number(values.price) : null,
  max_participants: values.max_participants ? Number(values.max_participants) : null,
  tag_ids: values.tag_ids,
});
