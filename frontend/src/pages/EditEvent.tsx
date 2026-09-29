import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { eventsApi, type EventInput } from '../api/eventsApi';
import EventForm from '../components/events/EventForm';
import { eventToFormValues, type EventFormValues } from '../components/events/eventFormValues';
import { LoadingSpinner } from '../components/ui/Loading';
import { getApiErrorMessage, notifyEventsChanged } from '../utils/helpers';

const EditEvent = () => {
  const { id: eventId = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [initialValues, setInitialValues] = useState<EventFormValues | null>(null);

  useEffect(() => {
    eventsApi.getEventDetails(eventId)
      .then((event) => {
        // The server enforces this too; redirect instead of showing a form that cannot be saved
        if (!event.viewer.is_creator) {
          toast.error('You can only edit your own events');
          navigate(`/events/${eventId}`, { replace: true });
        } else if (new Date(event.timestamp) <= new Date()) {
          toast.error('Past events cannot be edited');
          navigate(`/events/${eventId}`, { replace: true });
        } else {
          setInitialValues(eventToFormValues(event));
        }
      })
      .catch((error) => {
        toast.error(getApiErrorMessage(error, 'Failed to load event details'));
        navigate('/events', { replace: true });
      });
  }, [eventId, navigate]);

  const handleSubmit = async (input: EventInput) => {
    try {
      await eventsApi.updateEvent(eventId, input);
      toast.success('Event updated successfully!');
      notifyEventsChanged();
      navigate(`/events/${eventId}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update event'));
    }
  };

  if (!initialValues) {
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Event</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Participants are notified when you save changes</p>
          </div>
          <EventForm
            initialValues={initialValues}
            submitLabel="Update Event"
            onSubmit={handleSubmit}
            onCancel={() => navigate(`/events/${eventId}`)}
          />
        </div>
      </div>
    </div>
  );
};

export default EditEvent;
