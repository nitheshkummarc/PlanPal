import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CalendarDaysIcon,
  MapPinIcon,
  ClockIcon,
  UsersIcon,
  ShareIcon,
  HeartIcon,
  TrashIcon,
  ChevronLeftIcon,
  ExclamationTriangleIcon,
  CurrencyRupeeIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { eventsApi } from '../api/eventsApi';
import { LoadingSpinner, LoadingButton } from '../components/ui/Loading';
import TagChip from '../components/ui/TagChip';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatTime } from '../utils/dateUtils';
import toast from 'react-hot-toast';

const EventDetails = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [participationStatus, setParticipationStatus] = useState<any>(null);
  const [isLiked, setIsLiked] = useState(false);

  const {
    data: eventRaw,
    loading: eventLoading,
    error: eventError,
    execute: fetchEventRaw
  } = useApi(eventsApi.getEventDetails);

  const event = eventRaw && (eventRaw as any).event ? (eventRaw as any).event : eventRaw;

  const {
    execute: getParticipationStatus
  } = useApi(eventsApi.getParticipationStatus);

  useEffect(() => {
    if (eventId) {
      fetchEventRaw(eventId);
      loadParticipationStatus();
    }
  }, [eventId]);

  const loadParticipationStatus = async () => {
    if (!user) {
      setParticipationStatus({ status: 'not_joined' });
      return;
    }

    try {
      const status = await getParticipationStatus(eventId);
      setParticipationStatus(status);
    } catch (error) {
      console.error('Failed to load participation status:', error);
      setParticipationStatus({ status: 'not_joined' });
    }
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
      await Promise.all([
        fetchEventRaw(eventId),
        loadParticipationStatus()
      ]);

      setTimeout(() => {
        localStorage.setItem('eventUpdated', Date.now().toString());
        window.dispatchEvent(new CustomEvent('eventUpdated'));
      }, 100);
    } catch (error: any) {
      console.error('Join event error:', error);
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to join event');
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
      await Promise.all([
        fetchEventRaw(eventId),
        loadParticipationStatus()
      ]);
      localStorage.setItem('eventUpdated', Date.now().toString());
      window.dispatchEvent(new CustomEvent('eventUpdated'));
    } catch (error: any) {
      console.error('Leave event error:', error);
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to leave event');
    } finally {
      setIsLeaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!user) {
      toast.error('Please log in to delete events');
      navigate('/login');
      return;
    }

    const confirmed = window.confirm('Delete this event? This removes its participants and tag links.');
    if (!confirmed) {
      return;
    }

    try {
      setIsDeleting(true);
      await eventsApi.deleteEvent(eventId!);
      toast.success('Event deleted successfully');
      localStorage.setItem('eventUpdated', Date.now().toString());
      window.dispatchEvent(new CustomEvent('eventUpdated'));
      navigate('/events');
    } catch (error: any) {
      console.error('Delete event error:', error);
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to delete event');
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

  const isOwner = user?.user_id === event.posted_by || user?.user_id === event.created_by?.user_id;
  const isParticipant = participationStatus?.status === 'going' || participationStatus?.status === 'interested';
  const canJoin = user && !isOwner && !isParticipant && (event.status === 'upcoming' || !event.status);
  const canLeave = user && isParticipant && !isOwner;
  const canEdit = user && isOwner;
  const canDelete = user && (isOwner || (user as any).role === 'admin');
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
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    event.status === 'upcoming' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                    event.status === 'ongoing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                    event.status === 'completed' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400' :
                    'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {event.status}
                  </span>

                  {event.is_paid && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 flex items-center gap-1">
                      <CurrencyRupeeIcon className="h-4 w-4" />
                      Paid Event
                    </span>
                  )}
                </div>

                {event.category && (
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    {event.category}
                  </p>
                )}

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
                <button 
                  onClick={() => setIsLiked(!isLiked)}
                  className={`p-2 transition-colors ${isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                  title={isLiked ? "Unlike event" : "Like event"}
                >
                  {isLiked ? (
                    <HeartSolidIcon className="h-5 w-5" />
                  ) : (
                    <HeartIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CalendarDaysIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {event.timestamp ? formatDate(event.timestamp) : 'N/A'}
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
                        : (event.participants ? event.participants.length : 0)}
                      {event.max_participants ? ` / ${event.max_participants}` : ''} people
                    </p>
                    {event.max_participants && typeof event.current_participants === 'number' && event.current_participants >= event.max_participants && (
                      <p className="text-red-600 dark:text-red-400 text-sm">Event is full</p>
                    )}
                  </div>
                </div>

                {event.duration && (
                  <div className="flex items-start gap-3">
                    <ClockIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Duration</p>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {event.duration} minutes
                      </p>
                    </div>
                  </div>
                )}

                {event.created_by && (
                  <div className="flex items-start gap-3">
                    <div className="h-5 w-5 bg-blue-600 rounded-full mt-0.5 flex-shrink-0"></div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Organized by</p>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {event.created_by.name || event.created_by.username}
                      </p>
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

            <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {!user ? (
                  <span>
                    <a href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
                      Log in
                    </a>
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
                    <span className="font-medium text-green-600 dark:text-green-400">You're participating in this event</span>
                  </div>
                ) : event.status === 'upcoming' || !event.status ? (
                  <span>Join this event to participate</span>
                ) : (
                  <span>This event is {event.status}</span>
                )}
              </div>

              <div className="flex items-center gap-3">
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

                {isParticipant && !isOwner && !canLeave && (
                  <button className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 px-4 py-2 rounded-lg font-medium cursor-default" disabled>
                    ✓ Joined
                  </button>
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
