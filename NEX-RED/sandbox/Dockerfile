FROM python:3.12-slim-bookworm

# Ephemeral NEX-RED worker. Run with a user-defined network that only reaches the lab target.
# Example: docker run --read-only --cap-drop ALL --user 10001 ...
RUN useradd --create-home --uid 10001 nexred \
    && mkdir -p /app \
    && chown nexred:nexred /app

WORKDIR /app
COPY --chown=nexred:nexred . /app
USER nexred

ENV PYTHONDONTWRITEBYTECODE=1
CMD ["python", "nexred.py", "--help"]
