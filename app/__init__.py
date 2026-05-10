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
login_manager.session_protection = 'strong'
login_manager.login_view = 'auth.login'


def create_app(config_name='default'):
    """Application factory function."""
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

    # CORS configuration
    cors_origins = app.config.get('CORS_ORIGINS', ['http://192.168.0.50:5173', 'http://localhost:5173'])
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
    from app.routes import auth_bp, weight_bp, exercise_bp, food_bp, meals_bp, user_bp, dashboard_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(weight_bp, url_prefix='/api/weight')
    app.register_blueprint(exercise_bp, url_prefix='/api/exercise')
    app.register_blueprint(food_bp, url_prefix='/api/food')
    app.register_blueprint(meals_bp, url_prefix='/api/meals')
    app.register_blueprint(user_bp, url_prefix='/api/user')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    
    @login_manager.user_loader
    def load_user(user_id):
        from app.models.user import User
        return User.query.get(int(user_id))

    # Set cookie domain to .localhost so Vite proxy (5173) can access backend cookies from (5001)
    app.config['SESSION_COOKIE_DOMAIN'] = '.localhost'
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['SESSION_COOKIE_SECURE'] = False

    return app
