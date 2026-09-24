import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  CalendarDaysIcon,
  MapPinIcon,
  UsersIcon,
  ShareIcon,
  TrashIcon,
  ChevronLeftIcon,
  ExclamationTriangleIcon,
  CurrencyRupeeIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { eventsApi, type EventParticipant } from '../api/eventsApi';
import { LoadingSpinner, LoadingButton } from '../components/ui/Loading';
import TagChip from '../components/ui/TagChip';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatTime } from '../utils/dateUtils';
import toast from 'react-hot-toast';
import { getApiErrorMessage, notifyEventsChanged } from '../utils/helpers';

type ParticipationState = 'going' | 'interested' | 'not_joined';

const EventDetails = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [participationStatus, setParticipationStatus] = useState<ParticipationState>('not_joined');

  const {
    data: eventRaw,
    loading: eventLoading,
    error: eventError,
    execute: fetchEventRaw
  } = useApi(eventsApi.getEventDetails);

  const event = eventRaw && (eventRaw as any).event ? (eventRaw as any).event : eventRaw;

  useEffect(() => {
    if (eventId) {
      fetchEventRaw(eventId);
    }
  }, [eventId]);

  // Re-check once the logged-in user is known (auth loads asynchronously)
  useEffect(() => {
    if (eventId) {
      loadParticipationStatus();
    }
  }, [eventId, user?.user_id]);

  const loadParticipationStatus = async () => {
    if (!user || !eventId) {
      setParticipationStatus('not_joined');
      return;
    }

    try {
      const result = await eventsApi.getParticipationStatus(eventId);
      setParticipationStatus(result.status);
    } catch (error) {
      console.error('Failed to load participation status:', error);
      setParticipationStatus('not_joined');
    }
  };

  /** Reload this page's data and tell other pages (Dashboard, Calendar) to refresh. */
  const refreshAfterChange = async () => {
    await Promise.all([fetchEventRaw(eventId), loadParticipationStatus()]);
    notifyEventsChanged();
  };

  const handleJoinEvent = async () => {
    if (!user) {
      toast.error('Please log in to join events');
      navigate('/login');
      return;
    }

    try {
      setIsJoining(true);
      await eventsApi.joinEvent(eventId!);
      toast.success('Successfully joined the event!');
      await refreshAfterChange();
    } catch (error: unknown) {
      console.error('Join event error:', error);
      toast.error(getApiErrorMessage(error, 'Failed to join event'));
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveEvent = async () => {
    if (!user) {
      toast.error('Please log in to manage event participation');
      navigate('/login');
      return;
    }

    try {
      setIsLeaving(true);
      await eventsApi.leaveEvent(eventId!);
      toast.success('Successfully left the event');
      await refreshAfterChange();
    } catch (error: unknown) {
      console.error('Leave event error:', error);
      toast.error(getApiErrorMessage(error, 'Failed to leave event'));
    } finally {
      setIsLeaving(false);
    }
  };

  // Switch between 'interested' and 'going' (joining starts as 'interested')
  const handleStatusChange = async (status: 'interested' | 'going') => {
    if (status === participationStatus) return;
    try {
      setIsUpdatingStatus(true);
      await eventsApi.updateEventStatus(eventId!, status);
      toast.success(status === 'going' ? "You're going!" : 'Marked as interested');
      await refreshAfterChange();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Failed to update your status'));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!user) {
      toast.error('Please log in to delete events');
      navigate('/login');
      return;
    }

    const confirmed = window.confirm('Delete this event? Participants will be notified and it cannot be undone.');
    if (!confirmed) {
      return;
    }

    try {
      setIsDeleting(true);
      await eventsApi.deleteEvent(eventId!);
      toast.success('Event deleted successfully');
      notifyEventsChanged();
      navigate('/events');
    } catch (error: unknown) {
      console.error('Delete event error:', error);
      toast.error(getApiErrorMessage(error, 'Failed to delete event'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: event.title,
          text: event.description,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Event link copied to clipboard!');
      }
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  if (eventLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (eventError || !event) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <ExclamationTriangleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Event not found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The event you're looking for doesn't exist or has been removed.
            </p>
            <button
              onClick={() => navigate('/events')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Browse Events
            </button>
          </div>
        </div>
      </div>
    );
  }

  const participants: EventParticipant[] = event.participants || [];
  const isOwner = user?.user_id === event.posted_by;
  const isParticipant = participationStatus === 'going' || participationStatus === 'interested';
  const isEventPast = new Date(event.timestamp) < new Date();
  const canJoin = user && !isOwner && !isParticipant && !isEventPast;
  const canLeave = user && isParticipant && !isOwner && !isEventPast;
  const canChangeStatus = canLeave;
  const canEdit = user && isOwner && !isEventPast;
  const canDelete = user && (isOwner || user.role === 'admin');
  const isEventFull = event.max_participants && typeof event.current_participants === 'number' && event.current_participants >= event.max_participants;

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
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {event.title}
                  </h1>
                  {isEventPast && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
                      Past event
                    </span>
                  )}

                  {event.is_paid && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 flex items-center gap-1">
                      <CurrencyRupeeIcon className="h-4 w-4" />
                      Paid Event
                    </span>
                  )}
                </div>

                {event.is_paid && event.price && (
                  <div className="flex items-center gap-2 mb-4">
                    <CurrencyRupeeIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                      ₹{parseFloat(event.price).toFixed(2)}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">per person</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleShare}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title="Share event"
                >
                  <ShareIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CalendarDaysIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Date &amp; time</p>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {event.timestamp ? `${formatDate(event.timestamp)} · ${formatTime(event.timestamp)}` : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {event.place || 'Venue'}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      {event.location}
                    </p>
                    {event.city && event.state && (
                      <p className="text-gray-600 dark:text-gray-400">
                        {event.city}, {event.state}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <UsersIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Participants</p>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {typeof event.current_participants === 'number' && event.current_participants >= 0
                        ? event.current_participants
                        : participants.length}
                      {event.max_participants ? ` / ${event.max_participants}` : ''} people
                    </p>
                    {isEventFull && (
                      <p className="text-red-600 dark:text-red-400 text-sm">Event is full</p>
                    )}
                  </div>
                </div>

                {event.creator_name && (
                  <div className="flex items-start gap-3">
                    <div className="h-5 w-5 bg-blue-600 rounded-full mt-0.5 flex-shrink-0"></div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Organized by</p>
                      <Link
                        to={`/users/${event.posted_by}`}
                        className="text-gray-900 dark:text-white font-medium hover:underline"
                      >
                        {event.creator_name}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                About this event
              </h3>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">
                  {event.description}
                </p>
              </div>
            </div>

            {event.tags && event.tags.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag: any, index: number) => (
                    <TagChip key={index} tag={tag} />
                  ))}
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
                          {participant.user_id === event.posted_by ? 'organizer' : participant.status}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {!user ? (
                  <span>
                    <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
                      Log in
                    </Link>
                    {' '}to join events and participate
                  </span>
                ) : isOwner ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="font-medium text-blue-600 dark:text-blue-400">You're organizing this event</span>
                  </div>
                ) : isParticipant ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {participationStatus === 'going' ? "You're going to this event" : "You're interested in this event"}
                    </span>
                  </div>
                ) : isEventPast ? (
                  <span>This event has already passed</span>
                ) : (
                  <span>Join this event to participate</span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {canChangeStatus && (
                  <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden" role="group" aria-label="Your participation">
                    {(['interested', 'going'] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => handleStatusChange(status)}
                        disabled={isUpdatingStatus}
                        aria-pressed={participationStatus === status}
                        className={`px-3 py-2 text-sm font-medium transition-colors ${
                          participationStatus === status
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {status === 'going' ? 'Going' : 'Interested'}
                      </button>
                    ))}
                  </div>
                )}

                {canLeave && (
                  <LoadingButton
                    onClick={handleLeaveEvent}
                    loading={isLeaving}
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    Leave Event
                  </LoadingButton>
                )}

                {canJoin && (
                  <LoadingButton
                    onClick={handleJoinEvent}
                    loading={isJoining}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      isEventFull
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                    disabled={isEventFull}
                  >
                    {isEventFull ? 'Event Full' : 'Join Event'}
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
                    onClick={handleDeleteEvent}
                    loading={isDeleting}
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
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
