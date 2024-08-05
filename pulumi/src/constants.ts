export const HCLOUD_RESOURCES_NAME: string = "hetzner";

export const HCLOUD_LOCATION: string = "nbg1";
export const HCLOUD_NETWORK_ZONE: string = "eu-central";

export const DEFAULT_LABELS = {
    environment: "production",
    app: "hetzner",
}

export const NETWORK_CONFIG = {
    NETWORK_IP_RANGE: "10.0.0.0/8",
    PUBLIC_SUBNET_IP_RANGE: "10.0.1.0/24",
    PRIVATE_SUBNET_IP_RANGE: "10.0.2.0/24",
    NAT_SERVER_INTERNAL_IP: "10.0.1.2",
    JUMP_SERVER_INTERNAL_IP: "10.0.1.4",
    ROUTE_GATEWAY_IP: "10.0.0.1",
    RKE2_MASTER_NODE_INTERNAL_IP: "10.0.2.2",
    RKE2_AGENT_NODE_INTERNAL_IPS: ["10.0.2.3", "10.0.2.4"],
    DNS_RESOLVERS: "185.12.64.2 185.12.64.1",
}

export const SPECIFICATION_CONFIG = {
    LOAD_BALANCER_TYPE: "lb11",
    NAT_SERVER_TYPE: "ccx13",
    MASTER_NODE_SERVER_TYPE: "ccx13",
    AGENT_NODE_SERVER_TYPE: "ccx23",
}

export const SSH_PUB: string  = "ssh-rsa SSH_PUBKEY";