"""
Keeps the schema definitions consistent:
- every table, constraint and index in the models exists in database/init.sql
- the migration for existing databases creates the same constraints and indexes
- the notification types match between the models, the SQL CHECK constraint and the frontend
"""

import re
from pathlib import Path

import pytest

from app import db
from app.models import NOTIFICATION_TYPES

ROOT = Path(__file__).resolve().parents[2]
INIT_SQL = (ROOT / 'database' / 'init.sql').read_text(encoding='utf-8')
MIGRATION_SQL = (ROOT / 'database' / 'migrations' / '001_align_existing_schema.sql').read_text(encoding='utf-8')


def _model_names():
    names = []
    for table in db.metadata.sorted_tables:
        names.append(('table', table.name))
        for constraint in table.constraints:
            if constraint.name:
                names.append(('constraint', constraint.name))
        for index in table.indexes:
            names.append(('index', index.name))
    return names


@pytest.mark.parametrize('kind, name', _model_names())
def test_model_names_exist_in_init_sql(kind, name):
    pattern = rf'CREATE TABLE IF NOT EXISTS {name}\b' if kind == 'table' else rf'\b{name}\b'
    assert re.search(pattern, INIT_SQL), f'{kind} {name} is missing from database/init.sql'


@pytest.mark.parametrize('kind, name', [n for n in _model_names() if n[0] != 'table'])
def test_migration_creates_every_constraint_and_index(kind, name):
    assert re.search(rf'\b{name}\b', MIGRATION_SQL), f'{kind} {name} is missing from the migration'


def test_init_sql_indexes_are_declared_in_the_models():
    declared = {name for kind, name in _model_names() if kind == 'index'}
    in_sql = set(re.findall(r'CREATE (?:UNIQUE )?INDEX IF NOT EXISTS (\w+)', INIT_SQL))
    assert in_sql == declared


def test_notification_types_match_sql_and_frontend():
    sql_types = re.search(r'ck_notifications_type CHECK \(type IN \(([^)]*)\)', INIT_SQL).group(1)
    assert re.findall(r"'(\w+)'", sql_types) == list(NOTIFICATION_TYPES)

    schema = (ROOT / 'frontend' / 'src' / 'schemas' / 'notification.schema.ts').read_text(encoding='utf-8')
    frontend_types = re.search(r'NotificationType = z\.enum\(\[([^\]]*)\]', schema).group(1)
    assert re.findall(r"'(\w+)'", frontend_types) == list(NOTIFICATION_TYPES)
