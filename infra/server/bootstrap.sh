#!/usr/bin/env bash
# One-time setup of a new Hetzner server for Annecto Grid (M2, B-055).
#
# Run as root on a fresh Ubuntu 24.04 LTS server:
#   bash bootstrap.sh
#
# What it does:
#   - installs security updates, automatic security updates, a firewall and fail2ban
#   - turns off SSH password login (key login only)
#   - installs Docker from Docker's own package repository
#   - creates the user "deploy", which GitHub Actions uses to deploy (Docker only, no sudo)
#   - creates a new SSH key for GitHub and prints what goes into the repository's secrets
#   - creates /srv/grid and the Docker network "edge" used by Caddy
#
# The script can be run again; steps that are already done are skipped.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo bash bootstrap.sh" >&2
  exit 1
fi
. /etc/os-release
if [ "${ID:-}" != "ubuntu" ]; then
  echo "This script expects Ubuntu, found ${ID:-unknown}." >&2
  exit 1
fi

step() { printf '\n==> %s\n' "$1"; }

step "System updates"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get upgrade -yq
apt-get install -yq ca-certificates curl gnupg ufw fail2ban unattended-upgrades

step "Automatic security updates"
cat >/etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF

step "SSH: key login only"
mkdir -p /etc/ssh/sshd_config.d
cat >/etc/ssh/sshd_config.d/10-annecto-grid.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
EOF
sshd -t
systemctl reload ssh

step "Firewall: SSH, HTTP and HTTPS only"
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw allow 443/udp >/dev/null
ufw --force enable >/dev/null
systemctl enable --now fail2ban >/dev/null

step "Docker"
if ! command -v docker >/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    >/etc/apt/sources.list.d/docker.list
  apt-get update -q
  apt-get install -yq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
# Keep container logs from filling the disk.
if [ ! -f /etc/docker/daemon.json ]; then
  cat >/etc/docker/daemon.json <<'EOF'
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "5" } }
EOF
  systemctl restart docker
fi
systemctl enable --now docker >/dev/null

step "User 'deploy' for GitHub Actions"
if ! id deploy >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash deploy
fi
usermod -aG docker deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
touch /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys

NEW_KEY=""
if ! grep -q "github-actions-annecto-grid" /home/deploy/.ssh/authorized_keys; then
  tmp=$(mktemp -d)
  ssh-keygen -q -t ed25519 -N "" -C "github-actions-annecto-grid" -f "$tmp/key"
  cat "$tmp/key.pub" >>/home/deploy/.ssh/authorized_keys
  NEW_KEY=$(cat "$tmp/key")
  rm -rf "$tmp"
fi

step "Folders and Docker network"
install -d -m 755 -o deploy -g deploy /srv/grid /srv/grid/deploy /srv/grid/edge /srv/grid/test /srv/grid/prod
docker network inspect edge >/dev/null 2>&1 || docker network create edge >/dev/null

IP=$(curl -fsS -4 https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

printf '\n\n==================== DONE ====================\n'
echo "Add these in GitHub: the repository -> Settings -> Secrets and variables -> Actions."
echo
echo "Secret DEPLOY_HOST:"
echo "$IP"
echo
echo "Secret DEPLOY_KNOWN_HOSTS (all lines):"
for f in /etc/ssh/ssh_host_ed25519_key.pub /etc/ssh/ssh_host_ecdsa_key.pub /etc/ssh/ssh_host_rsa_key.pub; do
  [ -f "$f" ] && echo "$IP $(cut -d' ' -f1,2 "$f")"
done
echo
if [ -n "$NEW_KEY" ]; then
  echo "Secret DEPLOY_SSH_KEY (everything from BEGIN to END, both lines included):"
  echo "$NEW_KEY"
  echo
  echo "The key is shown only this time and is not stored on the server."
else
  echo "DEPLOY_SSH_KEY: a key for GitHub already exists and is not shown again."
  echo "To make a new one, remove the line with github-actions-annecto-grid from"
  echo "/home/deploy/.ssh/authorized_keys and run the script again."
fi
echo "=============================================="
