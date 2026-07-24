import pytest
import os
from app import create_app

def test_dev_config_boots_without_raising():
    app = create_app('development')
    assert app.config['DEBUG'] is True

@pytest.mark.parametrize("missing_var", [
    'SECRET_KEY',
    'JWT_SECRET_KEY',
    'ENCRYPTION_KEY',
    'SUPABASE_DATABASE_URL',
    'ALLOWED_ORIGINS'
])
def test_production_config_raises_when_missing(monkeypatch, missing_var):
    # Set all required vars first
    monkeypatch.setenv('SECRET_KEY', 'some-secret-key-123')
    monkeypatch.setenv('JWT_SECRET_KEY', 'some-jwt-secret-key-123')
    monkeypatch.setenv('ENCRYPTION_KEY', 'some-encryption-key-123')
    monkeypatch.setenv('SUPABASE_DATABASE_URL', 'postgresql://user:pass@db:5432/db')
    monkeypatch.setenv('ALLOWED_ORIGINS', 'https://example.com')

    # Remove the one we are testing
    monkeypatch.delenv(missing_var, raising=False)

    with pytest.raises(RuntimeError) as excinfo:
        create_app('production')
    
    assert missing_var in str(excinfo.value)

def test_production_config_passes_when_all_set(monkeypatch):
    monkeypatch.setenv('SECRET_KEY', 'some-secret-key-123')
    monkeypatch.setenv('JWT_SECRET_KEY', 'some-jwt-secret-key-123')
    monkeypatch.setenv('ENCRYPTION_KEY', 'some-encryption-key-123')
    monkeypatch.setenv('SUPABASE_DATABASE_URL', 'postgresql://user:pass@db:5432/db')
    monkeypatch.setenv('ALLOWED_ORIGINS', 'https://example.com')

    app = create_app('production')
    assert app.config['DEBUG'] is False

def test_testing_config():
    app = create_app('testing')
    assert app.config['TESTING'] is True
