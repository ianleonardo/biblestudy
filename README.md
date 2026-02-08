# Bible Study — AI Chat

Interactive AI chat for Bible study, built with Python Flask.

## Setup

1. Create a virtual environment and install dependencies:

   ```bash
   python -m venv .venv
   source .venv/bin/activate   # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` for the chat AI. Get a free key at [Google AI Studio](https://aistudio.google.com/app/apikey).

## Run

```bash
flask --app run run
# or
python run.py
```

Open http://127.0.0.1:5000 in your browser.

## Project structure

- `app/` — Flask application
  - `__init__.py` — app factory
  - `config.py` — configuration (dev/prod)
  - `blueprints/chat/` — chat page and `/api/chat` endpoint
  - `templates/` — Jinja2 templates
  - `static/` — CSS and JS
- `run.py` — entry point for local development
- `requirements.txt` — Python dependencies

## Deploy to GCP (Cloud Run)

1. **Build and push the image** (Artifact Registry; replace `REGION` and `PROJECT_ID`):

   ```bash
   gcloud auth configure-docker REGION-docker.pkg.dev
   docker build -t REGION-docker.pkg.dev/PROJECT_ID/biblestudy/app .
   docker push REGION-docker.pkg.dev/PROJECT_ID/biblestudy/app
   ```

2. **Deploy to Cloud Run**:

   ```bash
   gcloud run deploy biblestudy \
     --image REGION-docker.pkg.dev/PROJECT_ID/biblestudy/app \
     --region REGION \
     --platform managed \
     --allow-unauthenticated \
     --set-env-vars "GEMINI_API_KEY=your-key" \
     --set-env-vars "FLASK_ENV=production" \
     --set-env-vars "SECRET_KEY=your-secret"
   ```

   Or use Secret Manager for `GEMINI_API_KEY` and `SECRET_KEY` instead of `--set-env-vars`. The container listens on `PORT` (Cloud Run sets this to 8080).

## AI backend (Gemini)

The chat uses **Google Gemini** by default. Set `GEMINI_API_KEY` in `.env` (get one at [Google AI Studio](https://aistudio.google.com/app/apikey)). The app uses the `gemini-2.5-flash` model with a Bible-study system prompt. To use another LLM, edit `_get_ai_reply()` in `app/blueprints/chat/routes.py`.

## Troubleshooting: pip SSL errors (macOS)

If `pip install` fails with `SSLError` or `CERTIFICATE_VERIFY_FAILED` (e.g. OSStatus -26276), try in order:

1. **Run the Python certificate installer** (if you use the official python.org installer):
   - Open `/Applications/Python 3.x/` in Finder and double‑click **Install Certificates.command**.

2. **Use certifi and point pip to it** (works in venvs):
   ```bash
   # Install certifi without SSL (use a known-good pip or another machine), or use:
   curl -sS https://bootstrap.pypa.io/get-pip.py | python - --trusted-host pypi.org --trusted-host files.pythonhosted.org
   pip install certifi
   export SSL_CERT_FILE=$(python -c "import certifi; print(certifi.where())")
   export REQUESTS_CA_BUNDLE=$SSL_CERT_FILE
   pip install -r requirements.txt
   ```

3. **Temporary trusted-host install** (less secure; use only to bootstrap):
   ```bash
   pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org -r requirements.txt
   ```

4. **Corporate proxy / SSL inspection**: Get your org’s root CA (e.g. `.pem`), then in `~/.pip/pip.conf`:
   ```ini
   [global]
   cert = /path/to/your-corporate-root-ca.pem
   trusted-host = pypi.org files.pythonhosted.org
   ```

5. **Use Homebrew Python** (often has certs configured):
   ```bash
   brew install python
   /usr/local/bin/python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
