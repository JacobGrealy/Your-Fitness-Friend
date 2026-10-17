"""Tests for application configuration selection.

Guards the production/debug split: create_app() must never silently fall back
to DevelopmentConfig, which enables DEBUG and can leak tracebacks.
"""

import pytest

from app import _resolve_config_name
from app.config import ProductionConfig


def test_defaults_to_development(monkeypatch):
    monkeypatch.delenv('FLASK_CONFIG', raising=False)
    monkeypatch.delenv('FLASK_ENV', raising=False)

    assert _resolve_config_name() == 'development'


def test_reads_flask_env(monkeypatch):
    monkeypatch.delenv('FLASK_CONFIG', raising=False)
    monkeypatch.setenv('FLASK_ENV', 'production')

    assert _resolve_config_name() == 'production'


def test_flask_config_takes_precedence_over_flask_env(monkeypatch):
    monkeypatch.setenv('FLASK_CONFIG', 'testing')
    monkeypatch.setenv('FLASK_ENV', 'production')

    assert _resolve_config_name() == 'testing'


def test_explicit_argument_takes_precedence(monkeypatch):
    monkeypatch.setenv('FLASK_ENV', 'production')

    assert _resolve_config_name('testing') == 'testing'


def test_unknown_name_raises(monkeypatch):
    monkeypatch.delenv('FLASK_CONFIG', raising=False)
    monkeypatch.setenv('FLASK_ENV', 'prod')  # typo, not a real config

    with pytest.raises(ValueError, match='Unknown configuration'):
        _resolve_config_name()


def test_production_config_is_production_safe():
    assert ProductionConfig.DEBUG is False
    # Informational logs must survive into production, otherwise the existing
    # logger.info() calls throughout the routes become invisible.
    assert ProductionConfig.LOG_LEVEL == 'INFO'
    # A wildcard CORS default would let any site call the API on a user's behalf
    assert ProductionConfig.CORS_ORIGINS
    assert '*' not in ProductionConfig.CORS_ORIGINS
