"""
run.py - Application Entry Point

Why: Starts the Flask server and provides CLI commands

Functions:
- create_app(): Initializes Flask application with configuration
- make_shell_context(): Provides database models in Flask shell
- health_check(): Root endpoint to verify server is running
- api_endpoints(): Lists all available API endpoints
- init_db(): CLI command to initialize database tables

Usage:
    Development: python run.py
    Production: gunicorn run:app
    Shell: flask shell
    Init DB: flask init_db
"""

from dotenv import load_dotenv
load_dotenv()
from app import create_app, db
from app.models import User, Event, Participation, Notification
import os

# Create Flask application
app = create_app(os.getenv('FLASK_ENV', 'development'))

@app.shell_context_processor
def make_shell_context():
    """Make database models available in shell context"""
    return {
        'db': db,
        'User': User,
        'Event': Event,
        'Participation': Participation,
        'Notification': Notification,
    }

@app.route('/')
def health_check():
    """Simple health check endpoint"""
    return {'status': 'Backend is running!', 'message': 'Use /api/ endpoints'}

@app.route('/api')
def api_endpoints():
    """List all available API endpoints (keep in sync with app/routes/*)"""
    return {
        'message': 'PlanPal API Endpoints',
        'endpoints': {
            'auth': {
                'POST /api/auth/register': 'Register new user',
                'POST /api/auth/login': 'Login user',
                'POST /api/auth/logout': 'Logout (revokes tokens)',
                'POST /api/auth/refresh': 'Get a new access token',
                'GET /api/auth/profile': 'Get your profile',
                'PUT /api/auth/profile': 'Update your profile',
                'POST /api/auth/change-password': 'Change password'
            },
            'users': {
                'GET /api/users/profile': 'Get current user profile',
                'GET /api/users/search': 'Search users',
                'GET /api/users/<user_id>': 'Get a user\'s public profile'
            },
            'events': {
                'GET /api/events/': 'List upcoming events',
                'POST /api/events/': 'Create new event',
                'GET /api/events/<event_id>': 'Get event details',
                'PUT /api/events/<event_id>': 'Update event (creator)',
                'DELETE /api/events/<event_id>': 'Delete event (creator or admin)',
                'POST /api/events/<event_id>/join': 'Join event',
                'DELETE /api/events/<event_id>/leave': 'Leave event',
                'PUT /api/events/<event_id>/update-status': 'Set participation status (interested/going)',
                'GET /api/events/<event_id>/participation_status': 'Your participation status',
                'GET /api/events/my': 'Events you created',
                'GET /api/events/joined': 'Events you joined'
            },
            'notifications': {
                'GET /api/notifications/': 'Get your notifications',
                'POST /api/notifications/': 'Create a notification for yourself',
                'DELETE /api/notifications/': 'Delete all your notifications',
                'PUT /api/notifications/<id>/mark-read': 'Mark notification as read',
                'PUT /api/notifications/<id>/mark-unread': 'Mark notification as unread',
                'PUT /api/notifications/mark-all-read': 'Mark all notifications as read',
                'DELETE /api/notifications/<id>': 'Delete notification',
                'GET /api/notifications/types': 'List notification types',
                'GET /api/notifications/unread_count': 'Unread notification count',
                'POST /api/notifications/test': 'Send yourself a test notification'
            },
            'search': {
                'GET /api/search/': 'Search events, users and tags'
            },
            'tags': {
                'GET /api/tags/': 'List tags',
                'GET /api/tags/search': 'Search tags',
                'GET /api/tags/popular': 'Most used tags',
                'GET /api/tags/<tag_id>': 'Tag details',
                'POST /api/tags/': 'Create tag (admin)',
                'PUT /api/tags/<tag_id>': 'Update tag (admin)',
                'DELETE /api/tags/<tag_id>': 'Delete tag (admin)'
            },
            'system': {
                'GET /api/system/health': 'Liveness probe',
                'GET /api/system/ready': 'Readiness probe (checks the database)',
                'GET /api/system/version': 'API version'
            }
        }
    }

@app.cli.command()
def init_db():
    """Initialize the database"""
    db.create_all()


if __name__ == '__main__':
    # Only run the server if this script is executed directly
    # This prevents issues with Flask debug mode reloader
    app.run(
        host='localhost',  # Changed from 0.0.0.0 to localhost for CORS compatibility
        port=int(os.getenv('PORT', 5000)),
        debug=os.getenv('FLASK_ENV') == 'development'
    )
