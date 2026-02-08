"""
Bible Study AI Chat - Flask application factory.
"""
import os

from flask import Flask


def create_app(config_name: str | None = None) -> Flask:
    """Create and configure the Flask application."""
    pkg_dir = os.path.dirname(os.path.abspath(__file__))
    app = Flask(
        __name__,
        instance_relative_config=True,
        template_folder=os.path.join(pkg_dir, "templates"),
        static_folder=os.path.join(pkg_dir, "static"),
        static_url_path="/static",
    )

    # Default config; override via FLASK_ENV or config module
    env = config_name or os.environ.get("FLASK_ENV", "development")
    if env == "production":
        app.config.from_object("app.config.ProductionConfig")
    else:
        app.config.from_object("app.config.DevelopmentConfig")

    # Load instance config (e.g. .env) if present
    try:
        app.config.from_pyfile("config.py", silent=True)
    except OSError:
        pass

    # Register blueprints
    from app.blueprints.chat import bp as chat_bp
    from app.blueprints.quiz import bp as quiz_bp
    app.register_blueprint(chat_bp, url_prefix="/")
    app.register_blueprint(quiz_bp)

    return app
