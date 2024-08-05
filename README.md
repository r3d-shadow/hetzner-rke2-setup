# Single Master RKE2 Cluster Installation with Ansible

This repository contains Ansible playbooks for installing a single master RKE2 (Rancher Kubernetes Engine 2) cluster. The playbooks handle the installation and configuration of both the RKE2 server (master node) and agent nodes.

## Prerequisites

- Ansible installed on the control machine.
- SSH access to all the nodes.
- A valid token for the RKE2 cluster.

## Playbooks and Configuration Templates

#### RKE2 Server Playbook

This script is utilized in ordering and setting up the RKE2 server on the primary node. The important configuration files are created, downloaded RKE2 install script and initiates RKE2 server service. The server’s configuration template contains settings for token and node labels, applies node taints that restrict workloads to certain nodes thus ensuring that only the essential components are scheduled on the master node.

#### RKE2 Agent Playbook

This playbook installs the RKE2 agent on agent nodes and configures them. It generates any necessary configuration files, downloads the RKE2 install script, and starts the RKE2 agent service. The template of the agent configuration includes the parameters for a token, the server address, node labels, and the node IP.

## Usage

1. Clone this repository to your Ansible control machine.
2. Update the `vars.yaml` file with your specific configuration.
3. Run the playbooks using Ansible:

```sh
ansible-playbook playbooks/install_rke2_server.yaml
ansible-playbook playbooks/install_rke2_agent.yaml
```