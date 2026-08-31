FROM python:3.12-slim-bookworm

# Optional NEX-RED worker. Not a kernel firewall.
# Run with compose: read-only, cap-drop ALL, no-new-privileges, user 10001.
# HTTP egress is still gated in Python (sandbox/policy.py), not iptables.

RUN useradd --create-home --uid 10001 --shell /usr/sbin/nologin nexred \
    && mkdir -p /app /tmp/nexred \
    && chown -R nexred:nexred /app /home/nexred /tmp/nexred

WORKDIR /app
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt \
    && rm -rf /root/.cache/pip

COPY --chown=nexred:nexred . /app
USER nexred

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HOME=/home/nexred \
    NEX_RED_REPORTS_DIR=/tmp/nexred/reports \
    NEX_RED_WORKSPACES_DIR=/tmp/nexred/workspaces

WORKDIR /app
CMD ["python", "nexred.py", "--help"]
