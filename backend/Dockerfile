FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app
COPY pyproject.toml ./
COPY app ./app
COPY migrations ./migrations
COPY alembic.ini ./alembic.ini
RUN pip install --no-cache-dir .

EXPOSE 8000
CMD ["sh", "-c", "python -m alembic upgrade head && if [ \"$SEED_DEMO\" = \"true\" ]; then python -m app.seed; fi && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
