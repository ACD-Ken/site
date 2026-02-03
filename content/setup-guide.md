# Apple macOS → Docker → n8n → ngrok (Step-by-Step)

Complete guide to setting up an automation server on macOS using Docker, n8n, and ngrok for secure external access.

## My Mac Config

MacBook Air (M4) — macOS Tahoe 26.2 — RAM: 16GB, HD: 512GB

## Step 1: Install Homebrew

Homebrew is the package manager for macOS that we'll use to install other tools.

[STEP]
Open Terminal (Press Cmd + Space, type "Terminal", then press Enter)

[STEP]
Install Homebrew by running:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Verify Homebrew is installed and update your environment:

```bash
brew --version
brew doctor
brew update
```

If `brew` is not available immediately, follow the installer's printed instructions to add Homebrew to your shell environment (Apple Silicon commonly uses `/opt/homebrew`):

```bash
# Example (run if installer suggests it):
# eval "$(/opt/homebrew/bin/brew shellenv)"
```

(If you see warnings from `brew doctor` follow the suggested fixes before continuing.)


## Step 2: Install Docker & n8n

Docker Desktop is the recommended way for macOS users to run Docker and Docker Compose. Install via Homebrew Cask and then start the Docker app.

[STEP]
Install Docker Desktop via Homebrew:
```bash
brew install --cask docker
```

[STEP]
Start Docker (may prompt for permissions; wait until Docker menu shows as running):
```bash
open --background -a Docker
```

Verify Docker is installed and Compose is available:

```bash
docker --version
docker compose version
```

n8n can be run inside Docker (Docker Compose is convenient for persistence and configuration). See the n8n docs for a production-ready Docker Compose example: https://docs.n8n.io/

### Docker Compose example

A minimal `docker-compose.yml` example (suitable for local testing):

```yaml
version: "3.7"
services:
  n8n:
    image: n8nio/n8n:latest
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=changeme
      - N8N_HOST=localhost
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
    volumes:
      - ./n8n:/home/node/.n8n
```

Start it with:

```bash
docker compose up -d
```

### Verify Docker & n8n

[STEP]
Quick Docker verification:
```bash
# Verify Docker daemon and run a test container
docker run --rm hello-world

docker info
```

[STEP]
Verify Docker Compose and n8n:
```bash
# Show running services
docker compose ps

# Stream n8n logs
docker compose logs -f n8n
```

[STEP]
Verify n8n is reachable:
- Open `http://localhost:5678` in your browser. If you used the example environment variables above, sign in with **admin / changeme**.

Or use curl to check the HTTP response directly:
```bash
# If Basic Auth is enabled (example config)
curl -I -u admin:changeme http://localhost:5678

# If Basic Auth is disabled
curl -I http://localhost:5678
```

If n8n doesn't respond, check Docker Desktop is running and inspect logs with `docker compose logs -f n8n`. Stop the stack with `docker compose down` when finished.

## Step 3: Install ngrok & Sign up

ngrok exposes local servers to the internet and is handy for testing webhooks and remote integrations.

[STEP]
Install ngrok via Homebrew (cask or formula):

```bash
# GUI + CLI (recommended)
brew install --cask ngrok

# Or use the Homebrew formula if available:
brew install ngrok/ngrok/ngrok
```

Verify installation:

```bash
ngrok --version
```

[STEP]
Sign up for a free account at https://ngrok.com and copy your **Auth Token** from the dashboard (Account → Auth).

[STEP]
Add your auth token to your local ngrok config:

```bash
# ngrok v3
ngrok config add-authtoken <YOUR_AUTH_TOKEN>

# Older ngrok versions may use:
# ngrok authtoken <YOUR_AUTH_TOKEN>
```

[STEP]
Start a tunnel to your locally running service (example: n8n on port 5678):

```bash
ngrok http 5678
```

Once started, ngrok prints public HTTP/HTTPS forwarding URLs — open the HTTPS URL in your browser to reach your local service remotely. Note: the free tier uses ephemeral subdomains and has connection limits; review https://ngrok.com/pricing for details.
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"