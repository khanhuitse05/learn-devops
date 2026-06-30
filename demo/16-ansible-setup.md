# 16 - Ansible Setup and Configuration

## Objective

Learn how to install and configure Ansible for automated server provisioning. We will set up a local inventory and write a simple playbook to verify connectivity and understand the basic concepts of Configuration Management.

## Prerequisites

- Complete up to step 13 (or just step 01 if you are only running this locally).
- Mac or Linux environment (Ansible control node requires Unix-like OS).

## Knowledge to understand

- **Ansible** is an open-source IT automation tool that automates provisioning, configuration management, application deployment, and orchestration.
- **Control Node**: The machine where Ansible is installed and run from.
- **Managed Nodes**: The target devices (servers) that Ansible manages.
- **Inventory**: A file that contains information about the managed nodes.
- **Playbook**: YAML files that describe the desired state of the managed nodes.

## 1. Install Ansible

On macOS, you can install Ansible using Homebrew:

```bash
brew install ansible
```

On Ubuntu/Debian:

```bash
sudo apt update
sudo apt install -y ansible
```

Verify installation:

```bash
ansible --version
```

## 2. Set Up the Local Demo Inventory

Create a directory for Ansible files inside the `demo` folder (from the repository root):

```bash
mkdir -p demo/ansible
cd demo/ansible
```

Create an inventory file named `inventory.ini`:

```ini
[local]
localhost ansible_connection=local
```

## 3. Run an Ad-Hoc Command

Ansible can be run via ad-hoc commands for quick tasks. Let's ping our local node:

```bash
ansible all -i inventory.ini -m ping
```

You should see a `SUCCESS` response with `"ping": "pong"`.

## 4. Write a Simple Playbook

Create a file named `setup-app.yml` in the `demo/ansible` folder:

```yaml
---
- name: Setup Demo Node.js App
  hosts: local
  tasks:
    - name: Ensure Node.js is installed
      command: node -v
      register: node_version
      changed_when: false

    - name: Print Node.js version
      debug:
        msg: "Found Node.js version: {{ node_version.stdout }}"

    - name: Install server npm dependencies
      command: npm ci
      args:
        chdir: ../../server
      register: npm_install
      changed_when: "'added' in npm_install.stdout or 'updated' in npm_install.stdout"
```

## 5. Run the Playbook

Execute the playbook to verify the app dependencies:

```bash
ansible-playbook -i inventory.ini setup-app.yml
```

## Expected result

- Ansible is installed and functional.
- The `ansible -m ping` command returns successfully.
- The `setup-app.yml` playbook runs without errors, showing the Node.js version and ensuring npm packages are installed in the `server` directory.

## Cleanup

- None required. The files are kept in `demo/ansible` for further learning.

## Troubleshooting

- `ansible: command not found`: Ensure your package manager's bin directory is in your `PATH`.
- Node.js command fails: Ensure Node.js and NPM are installed on your system before running the playbook.
