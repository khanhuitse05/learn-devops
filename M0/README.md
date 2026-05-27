# M0: Linux, Terminal, Git, and Server Operations

M0 builds the foundation for daily DevOps work: moving around a Linux server,
reading logs, managing services, checking resources, and using Git safely.

## Learning Goals

- Navigate Linux filesystems and inspect files, logs, processes, ports, disk,
  and memory.
- Understand users, groups, file permissions, SSH basics, and environment
  variables.
- Manage services with `systemd` and troubleshoot failures with `journalctl`.
- Use Git branches, commits, tags, rollback commands, and release workflows.

## Core Topics

### Linux Operations

- Filesystem paths: `/etc`, `/var/log`, `/opt`, `/home`, `/tmp`.
- Permissions: read, write, execute; owner, group, others.
- Process inspection: `ps`, `top`, `htop`, `kill`.
- Network inspection: `ss`, `curl`, `dig`, `nslookup`.
- Disk inspection: `df`, `du`, inode usage.

### Services and Logs

- `systemctl status/start/stop/restart/reload`.
- `journalctl -u SERVICE`, `journalctl -f`, `journalctl --since`.
- Difference between application logs, system logs, and service manager logs.

### Git Workflow

- Branching and merging.
- Pull request workflow.
- Tags for releases.
- Rollback with `git revert`.
- Reading history with `git log`, `git show`, and `git diff`.

## Hands-On Lab

1. Start the demo app in `server/` locally.
2. Create a `systemd` service file for the app.
3. Start, stop, restart, and inspect the service.
4. Break the service intentionally with a wrong environment variable.
5. Use `journalctl` to find the failure reason.
6. Create a Git feature branch, commit a small README change, tag it, and revert
   it.

## Useful Commands

```bash
pwd
ls -lah
cd /var/log
tail -f /var/log/syslog
journalctl -u ssh -n 100
systemctl status ssh
ss -tulpn
df -h
du -h --max-depth=1 /var
git status
git log --oneline --decorate --graph
```

## Checklist

- You can explain where logs usually live on Ubuntu.
- You can tell whether a process is listening on a port.
- You can restart a service and read its logs.
- You can find why disk space is full.
- You can use Git without committing secrets or unrelated files.

## Extra Notes

- See `ubuntu-commands.md` for a longer command cheat sheet.
- Prefer `journalctl` for `systemd` services and `tail -f` for plain log files.
- Never run random production commands with `sudo` unless you understand the
  effect and have a rollback plan.
