FROM python:3.11-slim

WORKDIR /app

# Build dependencies for psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends libpq-dev gcc && \
    rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

RUN adduser --disabled-password --gecos '' appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 5000

# One worker by default: rate-limit counters are per process unless REDIS_URL is set.
# Raise WEB_CONCURRENCY together with REDIS_URL.
ENV WEB_CONCURRENCY=1
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:5000 --workers ${WEB_CONCURRENCY} --threads 4 --timeout 120 run:app"]
