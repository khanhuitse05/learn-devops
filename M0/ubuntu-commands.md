# M0: Ubuntu Commands for DevOps

This note collects essential Ubuntu/Linux commands used in daily DevOps work. The goal is not to memorize every option, but to understand which command helps you inspect files, debug services, read logs, check resources, and investigate network issues.

## Navigation and Files

### `pwd`

Print the current working directory.

```bash
pwd
```

Use this when you are not sure where you are in the filesystem.

### `ls`

List files and directories.

```bash
ls
ls -l
ls -la
ls -lh
```

Common options:

- `-l`: long format with permissions, owner, size, and modified time
- `-a`: include hidden files
- `-h`: human-readable file sizes

DevOps examples:

```bash
ls -lah /var/log
ls -lh /etc/nginx/sites-enabled
```

### `cd`

Change directory.

```bash
cd /var/log
cd ..
cd ~
cd -
```

Useful shortcuts:

- `..`: parent directory
- `~`: your home directory
- `-`: previous directory

### `cat`, `less`, and `head`

Read file contents.

```bash
cat /etc/os-release
less /var/log/syslog
head -n 20 /var/log/syslog
```

Use `less` for large files because it lets you scroll and search.

Inside `less`:

- `/text`: search
- `n`: next match
- `q`: quit

## Searching Text and Files

### `grep`

Search text in files or command output.

```bash
grep "error" app.log
grep -i "error" app.log
grep -R "listen" /etc/nginx
```

Common options:

- `-i`: case-insensitive search
- `-R`: recursive search in directories
- `-n`: show line numbers
- `-v`: invert match, showing lines that do not match

DevOps examples:

```bash
grep -i "failed" /var/log/auth.log
grep -R "server_name" /etc/nginx
journalctl -u nginx | grep -i error
```

### `find`

Find files and directories by name, type, size, or modified time.

```bash
find /var/log -name "*.log"
find /etc -type f -name "*.conf"
find /var/log -type f -size +100M
```

DevOps examples:

```bash
find /var/log -type f -mtime -1
find / -type f -name "nginx.conf" 2>/dev/null
find /var/log -type f -size +500M
```

Useful patterns:

- `-type f`: files only
- `-type d`: directories only
- `-name`: match name
- `-mtime -1`: modified in the last day
- `2>/dev/null`: hide permission denied errors

## Logs

### `tail`

Show the end of a file.

```bash
tail /var/log/syslog
tail -n 100 /var/log/syslog
tail -f /var/log/syslog
```

Common options:

- `-n 100`: show last 100 lines
- `-f`: follow new lines in real time

DevOps examples:

```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
tail -n 200 /var/log/auth.log
```

### `journalctl`

Read logs managed by `systemd`.

```bash
journalctl
journalctl -u nginx
journalctl -u docker
journalctl -f
```

Common options:

- `-u SERVICE`: show logs for one service
- `-f`: follow logs in real time
- `--since`: show logs since a time
- `-n`: show the last N lines

DevOps examples:

```bash
journalctl -u nginx -n 100
journalctl -u ssh --since "1 hour ago"
journalctl -u docker -f
journalctl -p err
```

Useful severity levels:

- `emerg`
- `alert`
- `crit`
- `err`
- `warning`
- `info`
- `debug`

## Services

### `systemctl`

Manage services on Ubuntu systems that use `systemd`.

```bash
systemctl status nginx
sudo systemctl start nginx
sudo systemctl stop nginx
sudo systemctl restart nginx
sudo systemctl reload nginx
```

Common service commands:

```bash
systemctl status SERVICE
sudo systemctl start SERVICE
sudo systemctl stop SERVICE
sudo systemctl restart SERVICE
sudo systemctl reload SERVICE
sudo systemctl enable SERVICE
sudo systemctl disable SERVICE
```

DevOps examples:

```bash
systemctl status ssh
systemctl status docker
sudo systemctl restart nginx
sudo systemctl enable docker
systemctl list-units --type=service --state=running
```

Important difference:

- `restart`: stops and starts the service
- `reload`: reloads config without fully stopping the service, if supported
- `enable`: starts service automatically on boot
- `start`: starts service now only

## Network Inspection

### `ss`

Inspect listening ports and network connections. `ss` is the modern replacement for `netstat`.

```bash
ss -tuln
ss -tulpn
```

Common options:

- `-t`: TCP
- `-u`: UDP
- `-l`: listening sockets
- `-n`: show numeric ports instead of names
- `-p`: show process using the socket

DevOps examples:

```bash
ss -tuln
sudo ss -tulpn | grep ":80"
sudo ss -tulpn | grep ":443"
sudo ss -tulpn | grep ":22"
```

Use this when you need to answer:

- Is the service listening?
- Which port is open?
- Which process owns the port?

### `netstat`

Older command for network inspection. It may require installing `net-tools`.

```bash
sudo apt update
sudo apt install net-tools
netstat -tulnp
```

Prefer `ss` on modern Ubuntu systems.

## Disk Usage

### `df`

Show filesystem disk usage.

```bash
df -h
df -h /
df -h /var
```

Common option:

- `-h`: human-readable sizes

DevOps examples:

```bash
df -h
df -ih
```

Use `df -ih` to check inode usage. A disk can fail to create files if inodes are full, even when disk space looks available.

### `du`

Show directory and file space usage.

```bash
du -sh /var/log
du -h /var/log
du -h --max-depth=1 /var
```

Common options:

- `-s`: summary
- `-h`: human-readable sizes
- `--max-depth=1`: show one directory level

DevOps examples:

```bash
sudo du -h --max-depth=1 /var | sort -h
sudo du -h --max-depth=1 /var/log | sort -h
sudo du -sh /var/lib/docker
```

Use `du` when `df` says the disk is full and you need to find what is using the space.

## Processes and System Resources

### `top`

Show live CPU, memory, and process usage.

```bash
top
```

Inside `top`:

- `q`: quit
- `P`: sort by CPU usage
- `M`: sort by memory usage
- `k`: kill a process

Use this when a server feels slow or overloaded.

### `htop`

Interactive process viewer. It is easier to use than `top`, but may need installation.

```bash
sudo apt update
sudo apt install htop
htop
```

Useful keys:

- `F6`: choose sort column
- `F9`: kill process
- `F10`: quit

## Package Management

### `apt`

Install, update, and remove packages.

```bash
sudo apt update
sudo apt upgrade
sudo apt install nginx
sudo apt remove nginx
```

Common commands:

```bash
apt search docker
apt show nginx
apt list --installed
```

DevOps examples:

```bash
sudo apt update
sudo apt install curl git unzip jq
apt list --installed | grep nginx
```

## Permissions

### `chmod`

Change file permissions.

```bash
chmod +x script.sh
chmod 644 file.txt
chmod 755 script.sh
```

Common permissions:

- `644`: owner can read/write, others can read
- `755`: owner can read/write/execute, others can read/execute

### `chown`

Change file owner and group.

```bash
sudo chown ubuntu:ubuntu app.log
sudo chown -R www-data:www-data /var/www/app
```

Use carefully with `-R` because it changes ownership recursively.

## Useful Command Combinations

Check if Nginx is running and listening on port 80:

```bash
systemctl status nginx
sudo ss -tulpn | grep ":80"
journalctl -u nginx -n 100
```

Find why disk is full:

```bash
df -h
sudo du -h --max-depth=1 / | sort -h
sudo du -h --max-depth=1 /var | sort -h
```

Watch an application log:

```bash
tail -f /var/log/app.log
```

Search recent service errors:

```bash
journalctl -u docker --since "30 minutes ago" -p warning
```

Find large log files:

```bash
sudo find /var/log -type f -size +100M
```

## Practice Checklist

- Move around the filesystem with `pwd`, `ls`, and `cd`.
- Read files with `cat`, `less`, `head`, and `tail`.
- Search logs and config with `grep`.
- Find files with `find`.
- Check service status with `systemctl`.
- Read service logs with `journalctl`.
- Inspect open ports with `ss`.
- Check disk usage with `df` and `du`.
- Monitor processes with `top` or `htop`.
- Install packages with `apt`.
