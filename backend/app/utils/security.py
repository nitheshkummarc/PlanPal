"""
security.py - Security Utilities

Why: Provides authentication, authorization, input sanitization, and security features

Functions/Decorators:
- safe_str_cmp(a, b): Timing-safe string comparison
- @require_auth(optional): JWT authentication decorator
- @admin_required: Admin-only decorator
- @validate_request_data(): Request validation decorator
- @rate_limit(limit, window): Rate limiting decorator
- log_security_event(): Log security events
- get_current_user(): Get authenticated user
- check_permissions(user, resource_type, action): Check permissions
- add_security_headers(response): Add security HTTP headers

Class: SecurityManager (static methods)
- generate_secure_token(): Create secure token
- hash_password() / verify_password(): Bcrypt password hashing
- sanitize_input(text): Clean input (XSS prevention)
- validate_ip_address(): IP validation
- check_rate_limit(): Rate limiting check
- generate_csrf_token() / verify_csrf_token(): CSRF protection
"""

"""
Security utilities for PlanPal backend
Provides comprehensive authentication, authorization, and security features
"""

import jwt
import secrets
import hashlib
import hmac
import functools
from datetime import datetime, timedelta, timezone
from flask import request, jsonify, current_app
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request, get_jwt
from app.models import User
from app import db
import re
import bleach

# Use hmac.compare_digest instead of werkzeug.security.safe_str_cmp for newer versions
def safe_str_cmp(a, b):
    """Safely compare two strings to prevent timing attacks"""
    return hmac.compare_digest(str(a), str(b))

class SecurityManager:
    """Central security management class"""
    
    @staticmethod
    def generate_secure_token(length=32):
        """Generate cryptographically secure random token"""
        return secrets.token_urlsafe(length)
    
    @staticmethod
    def hash_password(password):
        """Hash password with bcrypt"""
        from app import bcrypt
        return bcrypt.generate_password_hash(password).decode('utf-8')
    
    @staticmethod
    def verify_password(password, password_hash):
        """Verify password against hash"""
        from app import bcrypt
        return bcrypt.check_password_hash(password_hash, password)
    
    @staticmethod
    def sanitize_input(text, max_length=None):
        """Sanitize user input to prevent XSS and injection attacks"""
        if not text:
            return ''
        
        # Remove HTML tags and dangerous characters
        text = bleach.clean(text, tags=[], strip=True)
        
        # Remove potentially dangerous patterns
        dangerous_patterns = [
            r'<script[^>]*>.*?</script>',
            r'javascript:',
            r'data:',
            r'vbscript:',
            r'onclick',
            r'onerror',
            r'onload'
        ]
        
        for pattern in dangerous_patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE)
        
        # Limit length if specified
        if max_length:
            text = text[:max_length]
        
        return text.strip()
    
    @staticmethod
    def validate_ip_address(ip):
        """Validate IP address format"""
        import ipaddress
        try:
            ipaddress.ip_address(ip)
            return True
        except ValueError:
            return False
    
    @staticmethod
    def check_rate_limit(key, limit=60, window=60):
        """Simple in-memory rate limiting (for production use Redis)"""
        # This is a simplified version - in production use Redis
        # For now, just return True
        return True
    
    @staticmethod
    def generate_csrf_token():
        """Generate CSRF token"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def verify_csrf_token(token, session_token):
        """Verify CSRF token"""
        return safe_str_cmp(token, session_token)

def require_auth(optional=False):
    """
    Decorator to require authentication
    Args:
        optional (bool): If True, authentication is optional but user info is loaded if present
    """
    def decorator(f):
        @functools.wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                if optional:
                    # Optional auth - try to get user but don't fail if not authenticated
                    try:
                        verify_jwt_in_request(optional=True)
                        current_user_id = get_jwt_identity()
                        if current_user_id:
                            current_user = db.session.get(User, current_user_id)
                            if current_user and current_user.is_active:
                                kwargs['current_user'] = current_user
                            else:
                                kwargs['current_user'] = None
                        else:
                            kwargs['current_user'] = None
                    except:
                        kwargs['current_user'] = None
                else:
                    # Required auth
                    verify_jwt_in_request()
                    current_user_id = get_jwt_identity()
                    
                    if not current_user_id:
                        return jsonify({'error': 'Authentication required'}), 401
                    
                    current_user = db.session.get(User, current_user_id)
                    if not current_user:
                        return jsonify({'error': 'User not found'}), 404
                    
                    if not current_user.is_active:
                        return jsonify({'error': 'Account is deactivated'}), 401
                    
                    kwargs['current_user'] = current_user
                
                return f(*args, **kwargs)
                
            except Exception as e:
                current_app.logger.error(f"Auth error: {str(e)}")
                if optional:
                    kwargs['current_user'] = None
                    return f(*args, **kwargs)
                else:
                    return jsonify({'error': 'Authentication failed'}), 401
        
        return decorated_function
    return decorator

def admin_required(f):
    """Decorator to require admin privileges"""
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            verify_jwt_in_request()
            current_user_id = get_jwt_identity()
            
            if not current_user_id:
                return jsonify({'error': 'Authentication required'}), 401
            
            current_user = db.session.get(User, current_user_id)
            if not current_user:
                return jsonify({'error': 'User not found'}), 404
            
            if not current_user.is_active:
                return jsonify({'error': 'Account is deactivated'}), 401
            
            # Check for admin role (you can implement this based on your user model)
            if not getattr(current_user, 'is_admin', False):
                return jsonify({'error': 'Admin privileges required'}), 403
            
            kwargs['current_user'] = current_user
            return f(*args, **kwargs)
            
        except Exception as e:
            current_app.logger.error(f"Admin auth error: {str(e)}")
            return jsonify({'error': 'Authentication failed'}), 401
    
    return decorated_function

def validate_request_data(required_fields=None, optional_fields=None, max_lengths=None):
    """
    Decorator to validate request data
    Args:
        required_fields (list): List of required field names
        optional_fields (list): List of optional field names
        max_lengths (dict): Dict of field_name: max_length
    """
    def decorator(f):
        @functools.wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                data = request.get_json()
                
                if not data:
                    return jsonify({'error': 'Request data is required'}), 400
                
                # Check required fields
                if required_fields:
                    for field in required_fields:
                        if field not in data or not data[field]:
                            return jsonify({'error': f'{field} is required'}), 400
                
                # Sanitize all text fields
                sanitized_data = {}
                all_fields = (required_fields or []) + (optional_fields or [])
                
                for field in all_fields:
                    if field in data:
                        value = data[field]
                        if isinstance(value, str):
                            max_length = max_lengths.get(field) if max_lengths else None
                            sanitized_data[field] = SecurityManager.sanitize_input(value, max_length)
                        else:
                            sanitized_data[field] = value
                
                # Add any other fields that weren't in the validation lists
                for key, value in data.items():
                    if key not in sanitized_data:
                        if isinstance(value, str):
                            sanitized_data[key] = SecurityManager.sanitize_input(value)
                        else:
                            sanitized_data[key] = value
                
                kwargs['validated_data'] = sanitized_data
                return f(*args, **kwargs)
                
            except Exception as e:
                current_app.logger.error(f"Validation error: {str(e)}")
                return jsonify({'error': 'Invalid request data'}), 400
        
        return decorated_function
    return decorator

def rate_limit(limit=60, window=60):
    """
    Decorator for rate limiting
    Args:
        limit (int): Number of requests allowed per window
        window (int): Time window in seconds
    """
    def decorator(f):
        @functools.wraps(f)
        def decorated_function(*args, **kwargs):
            # Get client IP
            client_ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
            
            # Create rate limit key
            rate_limit_key = f"rate_limit:{client_ip}:{f.__name__}"
            
            # Check rate limit
            if not SecurityManager.check_rate_limit(rate_limit_key, limit, window):
                return jsonify({
                    'error': 'Rate limit exceeded',
                    'retry_after': window
                }), 429
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator

def log_security_event(event_type, details=None, user_id=None):
    """Log security-related events"""
    try:
        security_log = {
            'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
            'event_type': event_type,
            'user_id': user_id,
            'ip_address': request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr),
            'user_agent': request.headers.get('User-Agent'),
            'details': details
        }
        
        current_app.logger.warning(f"SECURITY_EVENT: {security_log}")
        
        # In production, you might want to send this to a separate security log
        # or security monitoring service
        
    except Exception as e:
        current_app.logger.error(f"Failed to log security event: {str(e)}")

def get_current_user():
    """Get current authenticated user"""
    try:
        verify_jwt_in_request()
        current_user_id = get_jwt_identity()
        
        if not current_user_id:
            return None
        
        current_user = db.session.get(User, current_user_id)
        if current_user and current_user.is_active:
            return current_user
        
        return None
        
    except:
        return None

def check_permissions(user, resource_type, action, resource_id=None):
    """
    Check if user has permissions for a specific action
    Args:
        user: User object
        resource_type: Type of resource (e.g., 'event', 'user', 'notification')
        action: Action being performed (e.g., 'create', 'read', 'update', 'delete')
        resource_id: ID of specific resource (for ownership checks)
    """
    if not user or not user.is_active:
        return False
    
    # Admin users have all permissions
    if getattr(user, 'is_admin', False):
        return True
    
    # Resource-specific permission logic
    if resource_type == 'event':
        if action in ['read', 'list']:
            return True  # All users can read events
        elif action == 'create':
            return True  # All users can create events
        elif action in ['update', 'delete'] and resource_id:
            # Check if user owns the event
            from app.models import Event
            event = db.session.get(Event, resource_id)
            return event and str(event.organizer_id) == str(user.user_id)
    
    elif resource_type == 'user':
        if action == 'read':
            return True  # All users can read public user info
        elif action in ['update', 'delete'] and resource_id:
            # Users can only modify their own profile
            return str(resource_id) == str(user.user_id)
    
    elif resource_type == 'notification':
        if action in ['read', 'update'] and resource_id:
            # Users can only access their own notifications
            from app.models import Notification
            notification = db.session.get(Notification, resource_id)
            return notification and str(notification.user_id) == str(user.user_id)
    
    # Default deny
    return False

# Security headers middleware
def add_security_headers(response):
    """Add security headers to response"""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Content-Security-Policy'] = "default-src 'self'"
    return response
