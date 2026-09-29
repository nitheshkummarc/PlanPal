import React from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { eventsApi, type EventInput } from '../api/eventsApi';
import EventForm from '../components/events/EventForm';
import { emptyEventForm } from '../components/events/eventFormValues';
import { getApiErrorMessage, notifyEventsChanged } from '../utils/helpers';

const CreateEvent = () => {
  const navigate = useNavigate();

  const handleSubmit = async (input: EventInput) => {
    try {
      const event = await eventsApi.createEvent(input);
      toast.success('Event created successfully!');
      notifyEventsChanged();
      navigate(`/events/${event.event_id}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to create event'));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create Event</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Fill in the details below to create a new event</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <EventForm
            initialValues={emptyEventForm}
            submitLabel="Create Event"
            onSubmit={handleSubmit}
            onCancel={() => navigate('/events')}
          />
        </div>
      </div>
    </div>
  );
};

export default CreateEvent;
