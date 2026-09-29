/**
 * eventForm.test.ts - The request body built by the shared create/edit event form.
 */
import { describe, expect, it } from 'vitest';
import { emptyEventForm, toEventInput, validateEventForm, type EventFormValues } from '../components/events/eventFormValues';

const valid: EventFormValues = {
  ...emptyEventForm,
  title: 'Tech Meetup',
  description: 'Talks and networking',
  date_time: '2099-01-01T18:00',
  place: 'Community Hall',
  location: '12 Main Street',
  city: 'Chennai',
  state: 'Tamil Nadu',
};

describe('toEventInput', () => {
  it('sends null to clear the capacity and the price of a free event', () => {
    const input = toEventInput({ ...valid, max_participants: '', is_paid: false, price: '300' });
    expect(input.max_participants).toBeNull();
    expect(input.price).toBeNull();
    expect(input.is_paid).toBe(false);
  });

  it('sends numbers for capacity and price of a paid event', () => {
    const input = toEventInput({ ...valid, max_participants: '25', is_paid: true, price: '499.50' });
    expect(input.max_participants).toBe(25);
    expect(input.price).toBe(499.5);
  });

  it('trims text and sends an empty description as null', () => {
    const input = toEventInput({ ...valid, title: '  Tech Meetup  ', description: '   ' });
    expect(input.title).toBe('Tech Meetup');
    expect(input.description).toBeNull();
  });
});

describe('validateEventForm', () => {
  it('accepts a complete form', () => {
    expect(validateEventForm(valid)).toEqual({});
  });

  it('uses the same limits as the backend', () => {
    const errors = validateEventForm({ ...valid, city: 'x'.repeat(101), place: 'x'.repeat(201) });
    expect(errors.city).toBe('City must be 100 characters or fewer');
    expect(errors.place).toBe('Place must be 200 characters or fewer');
  });

  it('requires a price above zero for paid events and a whole-number capacity', () => {
    const errors = validateEventForm({ ...valid, is_paid: true, price: '0', max_participants: '2.5' });
    expect(errors.price).toBeTruthy();
    expect(errors.max_participants).toBeTruthy();
  });
});
