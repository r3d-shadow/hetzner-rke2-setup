# Single Master RKE2 Cluster

## Pulumi (IaC)

### Setup

1. **SSH Firewall Creation**: A firewall is created to allow SSH access within the internal network. The firewall allows inbound TCP traffic on port 22 only from the specified network IP range. A VPN setup is necessary for secure access to the jump server. Users must connect to the VPN to gain access to the internal network and SSH into the jump server.

2. **NAT Server**: 
    - The NAT server is configured with cloud-init user data to enable IP forwarding and set up NAT using iptables.
    - The NAT server is connected to the network with a specified internal IP address.
    - A network route is created to forward traffic from the private subnet to the internet via the NAT server.

3. **Jump Server**: 
    - The jump server is configured similarly to the NAT server but is intended to provide a secure entry point into the private network.

4. **RKE2 Master Node**: 
    - The RKE2 master node is configured with user data to set up routing and DNS resolvers.
    - The server is added to the network with a private IP address.

5. **RKE2 Agent Nodes**: 
    - Each agent node is configured with to set up routing and DNS resolvers.
    - The nodes are added to the network with private IP addresses.

5. **Load Balancer Service**: 

    - The load balancer is connected to the public subnet and configured to use the internal IPs of the RKE2 agent nodes.
    - A load balancer service is configured to listen on port 80 (HTTP) and forward traffic to port 30010 on the backend servers. Port 30010 is the NodePort of the Kubernetes ingress.
    - Health checks are set up to ensure the backend servers are healthy and responsive.

### Setting Up Pulumi

1. **Export Pulumi Config Passphrase**:
   ```sh
   export PULUMI_CONFIG_PASSPHRASE=pulumi
   ```

2. **Create State Directory and Change to It**:
   ```sh
   cd state
   ```

3. **Login to Pulumi Using File Storage**:
   ```sh
   pulumi login file://$PWD
   ```

4. **Return to the Project Root Directory**:
   ```sh
   cd ..
   ```

5. **Install Project Dependencies**:
   Ensure you have the necessary npm packages listed in your `package.json`. Run:

   ```sh
   npm install
   ```

6. **Preview and Deploy Changes**:
   ```sh
   pulumi up
   ```

   Follow the prompts to preview and confirm the changes to be deployed.

### Additional Notes

#### Subnets

Subnets are used for organizing servers into logical groups based on their network configurations. They provide a way to manage and configure servers with different network requirements effectively. Right now, the subnets feature is not very useful. However, this will change in the future when we add more features. 
https://docs.hetzner.com/cloud/networks/faq/#what-are-subnets

##### Public Subnets

- Public subnets are assigned to servers that require a publicly accessible IP address.
- Servers in the public subnet are accessible from the internet.
- When configuring a server with a public subnet, ensure that its IP is enabled (`ipv4Enabled: true`). And internal IP addresses is in the public subnet range.

##### Private Subnets

- Private subnets are assigned to servers that do not require a publicly accessible IP address.
- Servers in the private subnet typically have internal IPs only.
- These internal IPs are suitable for communication within the network or with other servers in the same subnet.
- When configuring a server with a private subnet, ensure that its IP is disabled (`ipv4Enabled: false`). And internal IP addresses is in the private subnet range.

#### NAT Gateway Setup for Hetzner Cloud

1. **NAT Server Setup**:
   - Deploy a server in the public subnet and configure it as the NAT gateway using cloud-config.yaml
2. **Route Configuration**:
   - Add a route to the private network specifying the NAT server's IP address as the gateway/
3. **Node Configuration**:
   - Deploy nodes in the private subnet and configure them to use the NAT server as the gateway by using the cloud-config.yaml.
- https://community.hetzner.com/tutorials/how-to-set-up-nat-for-cloud-networks

---
## Ansible

The playbooks handle the installation and configuration of both the RKE2 server (master node) and agent nodes.

### Prerequisites

- Ansible installed on the control machine.
- SSH access to all the nodes.
- A valid token for the RKE2 cluster.

### Playbooks and Configuration Templates

##### RKE2 Server Playbook

This script is utilized in ordering and setting up the RKE2 server on the primary node. The important configuration files are created, downloaded RKE2 install script and initiates RKE2 server service. The server’s configuration template contains settings for token and node labels, applies node taints that restrict workloads to certain nodes thus ensuring that only the essential components are scheduled on the master node.

##### RKE2 Agent Playbook

This playbook installs the RKE2 agent on agent nodes and configures them. It generates any necessary configuration files, downloads the RKE2 install script, and starts the RKE2 agent service. The template of the agent configuration includes the parameters for a token, the server address, node labels, and the node IP.

### Usage

1. Clone this repository to your Ansible control machine.
2. Update the `vars.yaml` file with your specific configuration.
3. Run the playbooks using Ansible:

```sh
ansible-playbook playbooks/install_rke2_server.yaml
ansible-playbook playbooks/install_rke2_agent.yaml
```