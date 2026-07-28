"""
search.py - Unified Search Routes

Why: Provides search across events, users, and tags

Routes/Functions:
- unified_search(): GET /api/search/ - Search events, users, tags
  Query params: q (query), type (all/events/users/tags), limit, tag_ids, location, sort_by
  
Searches in:
- Events: title, description, city, state, place
- Users: name, username, bio
- Tags: name, description
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Event, User, Tag, EventTag, UserTag
from app.utils.validators import validate_uuid
from app.utils.responses import error_response
from datetime import datetime, timezone
import uuid

search_bp = Blueprint('search', __name__)

@search_bp.route('/', methods=['GET'])
def unified_search():
    """Unified search across users, events, and tags"""
    try:
        query = request.args.get('q', '').strip()
        search_type = request.args.get('type', 'all')  # all, events, users, tags
        limit = request.args.get('limit', 50, type=int)
        tag_ids = request.args.get('tag_ids', '').strip()
        location = request.args.get('location', '').strip()
        sort_by = request.args.get('sort_by', 'relevance')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        results = {}
        
        # Parse tag IDs
        tag_filter_ids = []
        if tag_ids:
            raw_tag_ids = [tid.strip() for tid in tag_ids.split(',') if tid.strip()]
            invalid_tag_ids = [tid for tid in raw_tag_ids if not validate_uuid(tid)]
            if invalid_tag_ids:
                return jsonify({'error': 'tag_ids must be comma-separated UUID values'}), 400
            tag_filter_ids = [uuid.UUID(tid) for tid in raw_tag_ids]
        
        if search_type in ['all', 'events']:
            # Search events
            event_query = Event.query.filter(
                Event.is_active == True
            )
            
            # Add text search if query provided
            if query:
                event_query = event_query.filter(
                    db.or_(
                        Event.title.ilike(f'%{query}%'),
                        Event.description.ilike(f'%{query}%'),
                        Event.city.ilike(f'%{query}%'),
                        Event.state.ilike(f'%{query}%'),
                        Event.place.ilike(f'%{query}%')
                    )
                )
            
            # Add tag filtering
            if tag_filter_ids:
                event_query = event_query.join(EventTag).filter(
                    EventTag.tag_id.in_(tag_filter_ids)
                )
            
            # Add location filtering
            if location:
                event_query = event_query.filter(
                    db.or_(
                        Event.city.ilike(f'%{location}%'),
                        Event.state.ilike(f'%{location}%'),
                        Event.place.ilike(f'%{location}%')
                    )
                )

            # Add date filtering
            if date_from:
                event_query = event_query.filter(Event.timestamp >= datetime.fromisoformat(date_from))
            if date_to:
                event_query = event_query.filter(Event.timestamp <= datetime.fromisoformat(date_to))
            
            # Apply sorting
            if sort_by == 'date':
                event_query = event_query.order_by(Event.timestamp.asc())
            else:
                event_query = event_query.order_by(Event.timestamp.asc())  # Default to date for now
            
            events = event_query.limit(limit).all()
            results['events'] = [event.to_dict() for event in events]
        
        if search_type in ['all', 'users']:
            # Search users
            user_query = User.query.filter(User.is_active == True)
            
            # Add text search if query provided
            if query:
                user_query = user_query.filter(
                    db.or_(
                        User.name.ilike(f'%{query}%'),
                        User.username.ilike(f'%{query}%'),
                        User.bio.ilike(f'%{query}%')
                    )
                )
            
            # Add tag filtering for users
            if tag_filter_ids:
                user_query = user_query.join(UserTag).filter(
                    UserTag.tag_id.in_(tag_filter_ids)
                )
            
            users = user_query.limit(limit).all()
            results['users'] = [user.to_dict() for user in users]
        
        if search_type in ['all', 'tags']:
            # Search tags (only with query, not tag filtering)
            if query:
                tags = Tag.query.filter(
                    db.or_(
                        Tag.name.ilike(f'%{query}%'),
                        Tag.description.ilike(f'%{query}%')
                    )
                ).limit(limit).all()
                
                results['tags'] = [tag.to_dict() for tag in tags]
            else:
                results['tags'] = []
        
        return jsonify({
            'query': query,
            'tag_ids': [str(tag_id) for tag_id in tag_filter_ids],
            'results': results
        }), 200
        
    except Exception as e:
        return error_response('Search failed', exc=e)
