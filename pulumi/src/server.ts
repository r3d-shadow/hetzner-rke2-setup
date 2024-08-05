import * as pulumi from "@pulumi/pulumi";
import * as hcloud from "@pulumi/hcloud";
import { ResourceOptions } from "@pulumi/pulumi";
import { HCLOUD_RESOURCES_NAME, DEFAULT_LABELS, HCLOUD_LOCATION, NETWORK_CONFIG, SPECIFICATION_CONFIG } from "./constants";
const sanitizedResourcesName = HCLOUD_RESOURCES_NAME.replace(/_/g, '-');


export async function createServers({ provider, network, publicSubnet, privateSubnet, sshKey }: { 
    provider: hcloud.Provider, 
    network: hcloud.Network,
    publicSubnet: hcloud.NetworkSubnet,
    privateSubnet: hcloud.NetworkSubnet,
    sshKey: hcloud.SshKey
 }):Promise<{ 
    jumpServer: hcloud.Server | null;
    natServer: hcloud.Server | null,
    rke2Agents: hcloud.Server[],
 }> {
    const sshFirewallName = `${sanitizedResourcesName}-ssh-internal-access`;
    const sshFirewallId = `ssh-server`
    const sshFirewall = new hcloud.Firewall(sshFirewallId, {
        name: sshFirewallName,
        rules: [
            {
                direction: "in",
                protocol: "tcp",
                port: "22",
                sourceIps: [
                    NETWORK_CONFIG.NETWORK_IP_RANGE,
                ],
            },
        ],
    }, { provider, dependsOn: [network, publicSubnet] });

    //-------------------- NAT SERVER: START --------------------\\
    // https://community.hetzner.com/tutorials/how-to-set-up-nat-for-cloud-networks
    const natServerName = `${sanitizedResourcesName}-nat-server`;
    const natServerId = "nat-server";
    const userData = `#cloud-config
    package_update: true
    package_upgrade: false
    runcmd:
      - |
        cat <<'EOF' >> /etc/networkd-dispatcher/routable.d/50-masq
        #!/bin/sh
        
        /bin/echo 1 > /proc/sys/net/ipv4/ip_forward
        /sbin/iptables -t nat -A POSTROUTING -s '${NETWORK_CONFIG.NETWORK_IP_RANGE}' -o eth0 -j MASQUERADE
        EOF
      - chmod +x /etc/networkd-dispatcher/routable.d/50-masq
      - reboot
    `;


    const natServer = new hcloud.Server(natServerId, {
        name: natServerName,
        image: "ubuntu-24.04",
        serverType: SPECIFICATION_CONFIG.NAT_SERVER_TYPE,
        location: HCLOUD_LOCATION,
        sshKeys: [sshKey.name],
        firewallIds: [sshFirewall.id.apply(id => parseInt(id))],
        publicNets: [
            {
                ipv4Enabled: true,
                ipv6Enabled: false,
            }
        ],
        networks: [{
            networkId: network.id.apply(id => parseInt(id)),
            ip: NETWORK_CONFIG.NAT_SERVER_INTERNAL_IP, // Public subnet ip address
        }],
        rebuildProtection: true,
        deleteProtection: true,
        userData: userData,
        labels: DEFAULT_LABELS
    }, { provider, dependsOn: [network, publicSubnet, sshFirewall] });

    const networkRoute = await new hcloud.NetworkRoute(natServerId, {
        networkId: network.id.apply(id => parseInt(id)),
        destination: "0.0.0.0/0",
        gateway: NETWORK_CONFIG.NAT_SERVER_INTERNAL_IP,
    }, {
        provider: provider,
        dependsOn: [network]
    });
    //-------------------- NAT SERVER: END --------------------\\

    //-------------------- JUMP SERVER: START --------------------\\
    const jumpServerName = `${sanitizedResourcesName}-jump-server`;
    const jumpServerId = "jump-server";
    const jumpServer = new hcloud.Server(jumpServerId, {
        name: jumpServerName,
        image: "ubuntu-24.04",
        serverType: SPECIFICATION_CONFIG.NAT_SERVER_TYPE,
        location: HCLOUD_LOCATION,
        sshKeys: [sshKey.name],
        firewallIds: [sshFirewall.id.apply(id => parseInt(id))],
        publicNets: [
            {
                ipv4Enabled: true,
                ipv6Enabled: false,
            }
        ],
        networks: [{
            networkId: network.id.apply(id => parseInt(id)),
            ip: NETWORK_CONFIG.JUMP_SERVER_INTERNAL_IP, // Public subnet ip address
        }],
        rebuildProtection: true,
        deleteProtection: true,
        labels: DEFAULT_LABELS
    }, { provider, dependsOn: [network, publicSubnet, sshFirewall] });
    //-------------------- JUMP SERVER: END --------------------\\
    
    //-------------------- RKE2 MAaster NODE: START --------------------\\
    const masterNodeName = `${sanitizedResourcesName}-rke2-server`;
    const masterNodeId = `rke2-server`
    const masterNodeUserData = `#cloud-config
    package_update: true
    package_upgrade: false
    runcmd:
    - |
        cat <<'EOF' >> /etc/networkd-dispatcher/routable.d/50-masq
        #!/bin/sh
        
        /sbin/ip route add default via ${NETWORK_CONFIG.ROUTE_GATEWAY_IP}
        EOF
    - chmod +x /etc/networkd-dispatcher/routable.d/50-masq
    - echo "DNS=${NETWORK_CONFIG.DNS_RESOLVERS}" | tee -a /etc/systemd/resolved.conf
    - reboot
    `;
    const masterNode = new hcloud.Server(masterNodeId, {
        name: masterNodeName,
        image: "ubuntu-24.04",
        serverType: SPECIFICATION_CONFIG.MASTER_NODE_SERVER_TYPE,
        location: HCLOUD_LOCATION,
        sshKeys: [sshKey.name],
        publicNets: [
            {
                ipv4Enabled: false,
                ipv6Enabled: false,
            }
        ],
        networks: [{
            networkId: network.id.apply(id => parseInt(id)),
            ip: NETWORK_CONFIG.RKE2_MASTER_NODE_INTERNAL_IP, // Private subnet ip address
        }],
        userData: masterNodeUserData,
        rebuildProtection: true,
        deleteProtection: true,
        labels: DEFAULT_LABELS
    }, { provider, dependsOn: [network, privateSubnet] });
    //-------------------- RKE2 MAaster NODE: END --------------------\\

    // -------------------- RKE2 AGENT NODE: START --------------------\\
    const rke2Agents = [];
    for await (const [index, nodeIp] of NETWORK_CONFIG.RKE2_AGENT_NODE_INTERNAL_IPS.entries()) {
        const nodeName = `${sanitizedResourcesName}-rke2-agent${index}`;
        const nodeId = `rke2-agent${index}`
        const agentNodeUserData = `#cloud-config
        package_update: true
        package_upgrade: false
        runcmd:
        - |
            cat <<'EOF' >> /etc/networkd-dispatcher/routable.d/50-masq
            #!/bin/sh
            
            /sbin/ip route add default via ${NETWORK_CONFIG.ROUTE_GATEWAY_IP}
            EOF
        - chmod +x /etc/networkd-dispatcher/routable.d/50-masq
        - echo "DNS=${NETWORK_CONFIG.DNS_RESOLVERS}" | tee -a /etc/systemd/resolved.conf
        - reboot
        `;
        const nodeServer = new hcloud.Server(nodeId, {
            name: nodeName,
            image: "ubuntu-24.04",
            serverType: SPECIFICATION_CONFIG.AGENT_NODE_SERVER_TYPE,
            location: HCLOUD_LOCATION,
            sshKeys: [sshKey.name],
            publicNets: [
                {
                    ipv4Enabled: false,
                    ipv6Enabled: false,
                }
            ],
            networks: [{
                networkId: network.id.apply(id => parseInt(id)),
                ip: nodeIp, // Private subnet ip address
            }],
            userData: agentNodeUserData,
            rebuildProtection: true,
            deleteProtection: true,
            labels: DEFAULT_LABELS
        }, { provider, dependsOn: [network, privateSubnet] });
        rke2Agents.push(nodeServer);
    }
    //-------------------- NODES: END --------------------\\

    return {
        jumpServer: null,
        natServer: null,
        rke2Agents: rke2Agents,
    };
}