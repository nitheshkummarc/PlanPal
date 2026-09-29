"""Security response headers added to every API response."""

from flask import request


def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Content-Security-Policy'] = "default-src 'none'; frame-ancestors 'none'"
    response.headers['Referrer-Policy'] = 'no-referrer'
    if request.is_secure:
        # HSTS is only meaningful (and only honoured by browsers) over HTTPS
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    return response
