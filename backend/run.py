"""
Application entry point.

    Development server:  python run.py
    Production:          gunicorn run:app
    Shell:               flask --app run shell

The database schema is created in Supabase from database/init.sql.
"""

import os

from dotenv import load_dotenv

load_dotenv()

from app import create_app, db  # noqa: E402
from app.models import Event, Notification, Participation, Tag, User  # noqa: E402

app = create_app(os.getenv('FLASK_ENV', 'development'))


@app.shell_context_processor
def make_shell_context():
    return {'db': db, 'User': User, 'Event': Event, 'Participation': Participation,
            'Notification': Notification, 'Tag': Tag}


if __name__ == '__main__':
    app.run(
        host='localhost',
        port=int(os.getenv('PORT', 5000)),
        debug=os.getenv('FLASK_ENV', 'development') == 'development',
    )
