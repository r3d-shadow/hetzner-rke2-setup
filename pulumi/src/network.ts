import * as pulumi from "@pulumi/pulumi";
import * as hcloud from "@pulumi/hcloud";
import { ResourceOptions } from "@pulumi/pulumi";
import { HCLOUD_RESOURCES_NAME, DEFAULT_LABELS, HCLOUD_NETWORK_ZONE, NETWORK_CONFIG } from "./constants";

export async function createNetwork({ provider }: { provider: hcloud.Provider }): Promise<{ 
    network: hcloud.Network,
    privateSubnet: hcloud.NetworkSubnet,
    publicSubnet: hcloud.NetworkSubnet,
 }> {
    const network = await new hcloud.Network("network1", {
        name: HCLOUD_RESOURCES_NAME,
        deleteProtection: true,
        ipRange: NETWORK_CONFIG.NETWORK_IP_RANGE,
        labels: DEFAULT_LABELS
    }, {
        provider: provider,
        dependsOn: []
    });

    //-------------------- SUBNET: START --------------------\\
    // https://docs.hetzner.com/cloud/networks/faq/#what-are-subnets
    // Right now, the subnets feature is not very useful. However, this will change in the future when we add more features.
    const publicSubnet = await new hcloud.NetworkSubnet("public-subnet1", {
        networkId: network.id.apply(id => parseInt(id)),
        type: "cloud",
        networkZone: HCLOUD_NETWORK_ZONE,
        ipRange: NETWORK_CONFIG.PUBLIC_SUBNET_IP_RANGE,
    }, {
        provider: provider,
        dependsOn: [network]
    });

    const privateSubnet = await new hcloud.NetworkSubnet("private-subnet1", {
        networkId: network.id.apply(id => parseInt(id)),
        type: "cloud",
        networkZone: HCLOUD_NETWORK_ZONE,
        ipRange: NETWORK_CONFIG.PRIVATE_SUBNET_IP_RANGE,
    }, {
        provider: provider,
        dependsOn: [network]
    });
    //-------------------- SUBNET: END --------------------\\

    return {network: network, privateSubnet: privateSubnet, publicSubnet: publicSubnet};
}
