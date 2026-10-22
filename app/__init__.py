import logging
from logging.handlers import RotatingFileHandler
import os
from flask import Flask, request, jsonify, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from flask_cors import CORS

db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()
# 'basic', not 'strong': strong invalidates the session whenever the client's IP
# or user agent changes, which logs the phone out every time it moves between
# the LAN address and the Tailscale HTTPS name (and between Wi-Fi and cellular).
# Override with SESSION_PROTECTION if a stricter host is ever wanted.
login_manager.session_protection = os.environ.get('SESSION_PROTECTION') or 'basic'
login_manager.login_view = 'auth.login'


def _resolve_config_name(config_name=None):
    """Resolve which configuration class create_app() should load.

    Order: explicit argument, then FLASK_CONFIG, then FLASK_ENV, then
    development. An unrecognised name raises instead of quietly falling back,
    because a silent fallback to DevelopmentConfig would enable DEBUG in
    production and leak tracebacks and source paths to clients.
    """
    from app.config import config

    if config_name is None:
        config_name = (
            os.environ.get('FLASK_CONFIG')
            or os.environ.get('FLASK_ENV')
            or 'development'
        )

    if config_name not in config:
        raise ValueError(
            f'Unknown configuration {config_name!r}; '
            f'expected one of: {", ".join(sorted(config))}'
        )
    return config_name


def create_app(config_name=None):
    """Application factory function."""
    config_name = _resolve_config_name(config_name)
    from app.config import config

    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)

    def unauthorized():
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Authentication required'}), 401
        return redirect(url_for('auth.login', next=request.url))

    login_manager.unauthorized = unauthorized

    # CORS configuration (origins come from config.CORS_ORIGINS, which is
    # driven by the CORS_ORIGINS environment variable)
    cors_origins = app.config.get('CORS_ORIGINS') or []
    cors_supports_credentials = app.config.get('CORS_SUPPORTS_CREDENTIALS', True)
    CORS(app, origins=cors_origins, supports_credentials=cors_supports_credentials, methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allow_headers=['Content-Type', 'Authorization'], max_age=3600)
    
    # Logging configuration
    if not app.debug and not app.testing:
        if not os.path.exists('logs'):
            os.mkdir('logs')
        handler = RotatingFileHandler('logs/app.log', maxBytes=10240000, backupCount=10)
        handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'))
        handler.setLevel(app.config.get('LOG_LEVEL', 'INFO'))
        app.logger.addHandler(handler)
        app.logger.setLevel(app.config.get('LOG_LEVEL', 'INFO'))
        app.logger.info('Application startup')
    
    # Register blueprints
    from app.routes import auth_bp, weight_bp, exercise_bp, food_bp, meals_bp, meals_ai_log_bp, user_bp, dashboard_bp, app_release_bp, download_bp, barcode_bp, diary_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(weight_bp, url_prefix='/api/weight')
    app.register_blueprint(exercise_bp, url_prefix='/api/exercise')
    from app.routes.health import bp as health_bp
    app.register_blueprint(health_bp, url_prefix='/api/health')
    app.register_blueprint(food_bp, url_prefix='/api/food')
    # Nested under /api/food so the diary endpoints sit with the rest of the diary.
    app.register_blueprint(diary_bp, url_prefix='/api/food/diary')
    app.register_blueprint(meals_bp, url_prefix='/api/meals')
    app.register_blueprint(meals_ai_log_bp, url_prefix='/api/meals')
    app.register_blueprint(user_bp, url_prefix='/api/user')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(app_release_bp, url_prefix='/api/app')
    # Published APK + metadata; deliberately outside app/static (see app_release.py)
    app.register_blueprint(download_bp)
    app.register_blueprint(barcode_bp, url_prefix='/api/food/barcode')
    
    @login_manager.user_loader
    def load_user(user_id):
        from app.models.user import User
        return User.query.get(int(user_id))

    # Serve frontend static files
    static_path = os.path.join(os.path.dirname(__file__), 'static')
    if os.path.exists(static_path):
        from flask import send_from_directory
        @app.route('/')
        def index():
            return send_from_directory(static_path, 'index.html')
        @app.route('/<path:path>')
        def static_files(path):
            # API paths must never fall through to the SPA shell: an
            # unregistered endpoint should answer with a JSON 404 rather than
            # 200 text/html, otherwise a client that expects JSON fails
            # confusingly while trying to parse the page.
            if path == 'api' or path.startswith('api/'):
                return jsonify({'error': 'Not found'}), 404
            # Serve index.html for all non-file routes (SPA fallback)
            static_files_to_check = ['index.html', 'favicon.ico', 'manifest.json']
            if path in static_files_to_check:
                return send_from_directory(static_path, path)
            # Check if the path corresponds to an actual static asset
            full_path = os.path.join(static_path, path)
            if os.path.isfile(full_path):
                return send_from_directory(static_path, path)
            # Otherwise serve index.html for React Router to handle
            return send_from_directory(static_path, 'index.html')

    # Cookie policy. These were hardcoded here, which silently overrode any
    # config class or environment setting — SESSION_COOKIE_SECURE is now driven
    # by the config so an HTTPS-only deployment can turn it on.
    app.config.setdefault('SESSION_COOKIE_SAMESITE', 'Lax')
    app.config.setdefault('SESSION_COOKIE_SECURE', False)

    return app
