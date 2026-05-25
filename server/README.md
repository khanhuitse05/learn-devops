# Demo Node.js Systemd Service

This folder contains a small Node.js HTTP app for learning DevOps basics with `systemd`, `systemctl`, and `journalctl`.

The app has no external npm dependencies.

## Files

- `app.js`: demo HTTP server
- `package.json`: Node project metadata and scripts
- `devops-demo-node.service`: sample `systemd` unit file

## Run Locally

```bash
node app.js
```

In another terminal:

```bash
curl http://localhost:3000/
curl http://localhost:3000/health
```

## Install as a Systemd Service on Ubuntu

These commands assume the repository is copied to `/opt/learn-devops`.

```bash
sudo mkdir -p /opt/learn-devops
sudo cp -R ~/learn-devops/* /opt/learn-devops/
sudo chown -R ubuntu:ubuntu /opt/learn-devops
```

Check Node.js path:

```bash
which node
```

If the result is not `/usr/bin/node`, update `ExecStart` in `devops-demo-node.service`.

Copy the service file:

```bash
sudo cp /opt/learn-devops/server/devops-demo-node.service /etc/systemd/system/devops-demo-node.service
sudo systemctl daemon-reload
```

Start and enable the service:

```bash
sudo systemctl start devops-demo-node
sudo systemctl enable devops-demo-node
```

Check service status:

```bash
systemctl status devops-demo-node
```

Test the app:

```bash
curl http://localhost:3000/health
```

## Read Logs

Show recent logs:

```bash
journalctl -u devops-demo-node -n 100
```

Follow logs in real time:

```bash
journalctl -u devops-demo-node -f
```

Show logs since a time:

```bash
journalctl -u devops-demo-node --since "10 minutes ago"
```

Show only errors:

```bash
journalctl -u devops-demo-node -p err
```

## Practice: Make the Service Fail

The `/crash` endpoint intentionally throws an error so you can practice reading failure logs and watching `systemd` restart the service.

```bash
curl http://localhost:3000/crash
systemctl status devops-demo-node
journalctl -u devops-demo-node -n 50
```

Because the service file has `Restart=on-failure`, `systemd` should restart it after the crash.

## Practice: Fail During Startup

Edit the service file:

```bash
sudo systemctl edit devops-demo-node
```

Add this override:

```ini
[Service]
Environment=FAIL_ON_START=true
```

Reload and restart:

```bash
sudo systemctl daemon-reload
sudo systemctl restart devops-demo-node
```

Check what happened:

```bash
systemctl status devops-demo-node
journalctl -u devops-demo-node -n 100
```

Remove the override when finished:

```bash
sudo systemctl revert devops-demo-node
sudo systemctl daemon-reload
sudo systemctl restart devops-demo-node
```

## Useful Commands

```bash
sudo systemctl start devops-demo-node
sudo systemctl stop devops-demo-node
sudo systemctl restart devops-demo-node
sudo systemctl disable devops-demo-node
systemctl status devops-demo-node
journalctl -u devops-demo-node -f
sudo ss -tulpn | grep ":3000"
```
