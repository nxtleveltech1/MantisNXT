FROM node:20-bookworm

# Base utilities + Postgres client for scripts that shell out to `psql`
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    openssh-client \
    postgresql-client \
    unzip \
  && rm -rf /var/lib/apt/lists/*

# Install Bun (repo uses bun as package manager + runner)
# Install into the `node` user's home so `bun install` can write caches without permission issues.
ENV BUN_INSTALL=/home/node/.bun
ENV PATH="${BUN_INSTALL}/bin:${PATH}"
RUN curl -fsSL https://bun.sh/install | bash \
  && ln -sf /home/node/.bun/bin/bun /usr/local/bin/bun \
  && chown -R node:node /home/node/.bun

WORKDIR /app

# Entry point fixes volume permissions (node_modules / bun cache) then runs as `node`.
COPY .devcontainer/entrypoint.sh /usr/local/bin/mantisnxt-entrypoint
RUN chmod +x /usr/local/bin/mantisnxt-entrypoint

USER root


