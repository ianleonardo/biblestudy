"""
Quiz blueprint: Bible study quiz with level choice and review.
"""
from flask import Blueprint

bp = Blueprint("quiz", __name__, url_prefix="/quiz")

from app.blueprints.quiz import routes  # noqa: E402, F401
