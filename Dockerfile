# Bible Study — production image for GCP (Cloud Run, GKE, etc.)
FROM python:3.12-slim

# Prevent Python from writing pyc and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# GCP Cloud Run sets PORT (default 8080)
ENV PORT=8080

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY app/ ./app/
COPY run.py .

# Run with gunicorn (production WSGI server)
# 0.0.0.0 so the server is reachable from outside the container
EXPOSE 8080
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT} --workers 2 --threads 4 --timeout 60 run:app"]
