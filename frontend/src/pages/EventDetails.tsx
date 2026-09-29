import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  CurrencyRupeeIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  ShareIcon,
  TrashIcon,
  UserIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { eventsApi } from '../api/eventsApi';
import { LoadingButton, LoadingSpinner } from '../components/ui/Loading';
import TagChip from '../components/ui/TagChip';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatTime } from '../utils/dateUtils';
import { formatCurrency, getApiErrorMessage, getApiErrorStatus, notifyEventsChanged } from '../utils/helpers';
import type { EventDetail, ParticipationStatus } from '../types';

type PendingAction = 'join' | 'leave' | 'status' | 'delete' | null;

const EventDetails = () => {
  const { id: eventId = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<{ status?: number; message: string } | null>(null);
  const [pending, setPending] = useState<PendingAction>(null);

  const loadEvent = useCallback(async () => {
    try {
      setEvent(await eventsApi.getEventDetails(eventId));
      setLoadError(null);
    } catch (error) {
      setLoadError({ status: getApiErrorStatus(error), message: getApiErrorMessage(error, 'Failed to load the event') });
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    setLoading(true);
    void loadEvent();
  }, [loadEvent]);

  /** Run an action, then reload this page and tell other pages (Dashboard, Calendar) to refresh. */
  const runAction = async (
    action: PendingAction, request: () => Promise<unknown>, success: string, failure: string
  ): Promise<boolean> => {
    setPending(action);
    try {
      await request();
      toast.success(success);
      notifyEventsChanged();
      if (action !== 'delete') await loadEvent();
      return true;
    } catch (error) {
      toast.error(getApiErrorMessage(error, failure));
      return false;
    } finally {
      setPending(null);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this event? Participants will be notified and it cannot be undone.')) return;
    if (await runAction('delete', () => eventsApi.deleteEvent(eventId), 'Event deleted', 'Failed to delete event')) {
      navigate('/events');
    }
  };

  const handleStatusChange = (status: ParticipationStatus) => {
    if (event && status !== event.viewer.status) {
      void runAction(
        'status',
        () => eventsApi.updateParticipationStatus(eventId, status),
        status === 'going' ? "You're going!" : 'Marked as interested',
        'Failed to update your status'
      );
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: event?.title, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Event link copied to clipboard!');
      }
    } catch {
      // Share sheet dismissed
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!event) {
    const notFound = loadError?.status === 404 || loadError?.status === 400;
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-12">
          <ExclamationTriangleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {notFound ? 'Event not found' : 'Could not load this event'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {notFound ? "The event you're looking for doesn't exist or has been removed." : loadError?.message}
          </p>
          <div className="flex gap-3 justify-center">
            {!notFound && (
              <button onClick={() => { setLoading(true); void loadEvent(); }} className="btn-primary">
                Try again
              </button>
            )}
            <button
              onClick={() => navigate('/events')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium"
            >
              Browse Events
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { viewer, participants } = event;
  const isOwner = viewer.is_creator;
  const isParticipant = viewer.status !== 'not_joined';
  const isPast = new Date(event.timestamp) <= new Date();
  const isFull = event.max_participants !== null && event.current_participants >= event.max_participants;
  const canJoin = !isParticipant && !isPast;
  const canManageParticipation = isParticipant && !isOwner && !isPast;
  const canEdit = isOwner && !isPast;
  const canDelete = isOwner || user?.role === 'admin';

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

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{event.title}</h1>
                  {isPast && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
                      Past event
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <CurrencyRupeeIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                    {event.is_paid && event.price !== null ? `${formatCurrency(event.price)} per person` : 'Free'}
                  </span>
                </div>
              </div>
              <button
                onClick={handleShare}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Share event"
              >
                <ShareIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CalendarDaysIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Date &amp; time</p>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {formatDate(event.timestamp)} · {formatTime(event.timestamp)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
                    <p className="text-gray-900 dark:text-white font-medium">{event.place}</p>
                    <p className="text-gray-600 dark:text-gray-400">{event.location}</p>
                    <p className="text-gray-600 dark:text-gray-400">{event.city}, {event.state}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <UsersIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Participants</p>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {event.current_participants}
                      {event.max_participants !== null && ` / ${event.max_participants}`} people
                    </p>
                    {isFull && <p className="text-red-600 dark:text-red-400 text-sm">Event is full</p>}
                  </div>
                </div>
                {event.creator_name && (
                  <div className="flex items-start gap-3">
                    <UserIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Organised by</p>
                      <Link to={`/users/${event.posted_by}`} className="text-gray-900 dark:text-white font-medium hover:underline">
                        {event.creator_name}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {event.description && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">About this event</h3>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">{event.description}</p>
              </div>
            )}

            {event.tags.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag) => <TagChip key={tag.tag_id} tag={tag} />)}
                </div>
              </div>
            )}

            {participants.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Who's coming ({participants.length})
                </h3>
                <ul className="flex flex-wrap gap-2">
                  {participants.map((participant) => (
                    <li key={participant.user_id}>
                      <Link
                        to={`/users/${participant.user_id}`}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        {participant.profile_image_url ? (
                          <img src={participant.profile_image_url} alt="" className="h-5 w-5 rounded-full object-cover" />
                        ) : (
                          <UserIcon className="h-4 w-4 text-gray-400" />
                        )}
                        {participant.name}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {participant.user_id === event.posted_by ? 'organiser' : participant.status}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {isOwner ? (
                  <span className="font-medium text-blue-600 dark:text-blue-400">You're organising this event</span>
                ) : isParticipant ? (
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {viewer.status === 'going' ? "You're going to this event" : "You're interested in this event"}
                  </span>
                ) : isPast ? (
                  <span>This event has already passed</span>
                ) : (
                  <span>Join this event to participate</span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {canManageParticipation && (
                  <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden" role="group" aria-label="Your participation">
                    {(['interested', 'going'] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => handleStatusChange(status)}
                        disabled={pending !== null}
                        aria-pressed={viewer.status === status}
                        className={`px-3 py-2 text-sm font-medium transition-colors ${
                          viewer.status === status
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {status === 'going' ? 'Going' : 'Interested'}
                      </button>
                    ))}
                  </div>
                )}

                {canManageParticipation && (
                  <LoadingButton
                    onClick={() => runAction('leave', () => eventsApi.leaveEvent(eventId), 'You left the event', 'Failed to leave event')}
                    loading={pending === 'leave'}
                    className="px-4 py-2 rounded-lg font-medium border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    Leave Event
                  </LoadingButton>
                )}

                {canJoin && (
                  <LoadingButton
                    onClick={() => runAction('join', () => eventsApi.joinEvent(eventId), 'Successfully joined the event!', 'Failed to join event')}
                    loading={pending === 'join'}
                    disabled={isFull}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      isFull ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {isFull ? 'Event Full' : 'Join Event'}
                  </LoadingButton>
                )}

                {canEdit && (
                  <button
                    onClick={() => navigate(`/events/${eventId}/edit`)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                  >
                    Edit Event
                  </button>
                )}

                {canDelete && (
                  <LoadingButton
                    onClick={handleDelete}
                    loading={pending === 'delete'}
                    className="px-4 py-2 rounded-lg font-medium border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <span className="inline-flex items-center gap-2">
                      <TrashIcon className="h-4 w-4" />
                      Delete Event
                    </span>
                  </LoadingButton>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;
