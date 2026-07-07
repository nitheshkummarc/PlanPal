"""
validators.py - Input Validation and Sanitization

Why: Validates and sanitizes user input for security and data integrity

Validation Functions:
- validate_email(email): Email format + security checks
- validate_password(password): 8-128 chars, upper, lower, digit, special char
- validate_text_length(text, max_length): Length validation
- validate_name(name): Letters, spaces, hyphens only
- validate_phone(phone): 10-15 digits
- validate_uuid(uuid_string): UUID format check

Sanitization Functions:
- sanitize_filename(filename): Remove dangerous chars, prevent directory traversal
- sanitize_search_query(query): Prevent SQL injection
- generate_event_slug(title): Create URL-friendly slug

Formatting Functions:
- format_currency(amount, currency): Format as ₹X,XXX.XX
- truncate_text(text, max_length): Add ellipsis to long text
"""

import re
from flask import current_app

def validate_email(email):
    """Validate email format with enhanced security checks"""
    if not email or len(email) > current_app.config.get('MAX_EMAIL_LENGTH', 254):
        return False
    
    # SECURITY: More comprehensive email validation
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        return False
    
    # SECURITY: Prevent email with dangerous patterns
    dangerous_patterns = ['..', '+', 'script', 'javascript:', 'data:']
    email_lower = email.lower()
    for pattern in dangerous_patterns:
        if pattern in email_lower:
            return False
    
    return True

def validate_password(password):
    """Validate password strength with enhanced requirements"""
    if not password or len(password) < 8 or len(password) > 128:
        return False
    
    # Check for at least one uppercase letter
    if not re.search(r'[A-Z]', password):
        return False
    
    # Check for at least one lowercase letter
    if not re.search(r'[a-z]', password):
        return False
    
    # Check for at least one digit
    if not re.search(r'\d', password):
        return False
    
    # SECURITY: Check for at least one special character
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False
    
    # SECURITY: Prevent common weak passwords
    weak_patterns = ['password', '12345', 'qwerty', 'admin']
    password_lower = password.lower()
    for pattern in weak_patterns:
        if pattern in password_lower:
            return False
    
    return True

def validate_text_length(text, max_length=None):
    """Validate text length according to configuration"""
    if max_length is None:
        max_length = current_app.config.get('MAX_TEXT_LENGTH', 10000)
    
    return text and len(text) <= max_length

def validate_name(name):
    """Validate name with length and character restrictions"""
    if not name or len(name) > current_app.config.get('MAX_NAME_LENGTH', 100):
        return False
    
    # SECURITY: Only allow letters, spaces, hyphens, and apostrophes
    pattern = r"^[a-zA-Z\s\-']+$"
    return re.match(pattern, name) is not None

def validate_phone(phone):
    """Validate phone number format"""
    # Simple validation for Indian phone numbers
    pattern = r'^[+]?[0-9]{10,15}$'
    return re.match(pattern, phone) is not None

def sanitize_filename(filename):
    """Sanitize filename for safe storage with enhanced security"""
    if not filename:
        return 'unnamed_file'
    
    # SECURITY: Remove or replace dangerous characters
    filename = re.sub(r'[^\w\s.-]', '', filename)
    filename = re.sub(r'\s+', '_', filename)
    filename = filename.strip('.')  # Remove leading/trailing dots
    
    # SECURITY: Prevent directory traversal
    filename = filename.replace('..', '').replace('/', '').replace('\\', '')
    
    # SECURITY: Limit length and ensure not empty
    filename = filename[:100] if filename else 'unnamed_file'
    
    return filename

def validate_uuid(uuid_string):
    """Validate UUID format"""
    uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    return re.match(uuid_pattern, str(uuid_string).lower()) is not None

def sanitize_search_query(query):
    """Sanitize search query to prevent injection attacks"""
    if not query:
        return ''
    
    # SECURITY: Remove potentially dangerous SQL characters
    query = re.sub(r'[;\'\"\\]', '', query)
    query = query.strip()
    
    # Limit length
    return query[:100] if query else ''

def format_currency(amount, currency='INR'):
    """Format currency amount"""
    if currency == 'INR':
        return f"₹{amount:,.2f}"
    else:
        return f"{amount:,.2f} {currency}"

def truncate_text(text, max_length=100):
    """Truncate text to specified length"""
    if len(text) <= max_length:
        return text
    return text[:max_length-3] + "..."

def generate_event_slug(title):
    """Generate URL-friendly slug from event title"""
    slug = title.lower()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'\s+', '-', slug)
    return slug[:50]  # Limit length
