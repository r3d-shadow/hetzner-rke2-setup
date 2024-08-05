import * as pulumi from "@pulumi/pulumi";
import * as hcloud from "@pulumi/hcloud";
import { ResourceOptions } from "@pulumi/pulumi";
import { HCLOUD_RESOURCES_NAME, DEFAULT_LABELS, HCLOUD_NETWORK_ZONE, NETWORK_CONFIG, HCLOUD_LOCATION, SPECIFICATION_CONFIG } from "./constants";

    
export async function createLoadBalancer({ provider, publicSubnet, servers }: { 
        provider: hcloud.Provider,
        publicSubnet: hcloud.NetworkSubnet,
        servers: hcloud.Server[],
    }): 
    Promise<{ 
        loadBalancer: hcloud.LoadBalancer
    }> {
    //-------------------- LB: START --------------------\\
    const loadBalancer = await new hcloud.LoadBalancer("load-balancer", {
        name: HCLOUD_RESOURCES_NAME,
        loadBalancerType: SPECIFICATION_CONFIG.LOAD_BALANCER_TYPE,
        networkZone: HCLOUD_NETWORK_ZONE,
        deleteProtection: true,
        algorithm: {
            type: "round_robin",
        },
        labels: DEFAULT_LABELS
    }, {
        provider: provider,
        dependsOn: []
    });

    const loadBalancerNetwork = await new hcloud.LoadBalancerNetwork("load-balancer", {
        enablePublicInterface: true,
        loadBalancerId: loadBalancer.id.apply(id => parseInt(id)),
        subnetId: publicSubnet.id
    }, {
        provider: provider,
        dependsOn: [loadBalancer]
    });



    for await (const [index, server] of servers.entries()) {
        const loadBalancerTargetId = `load-balancer${index}`
        const loadBalancerTargetResource = await new hcloud.LoadBalancerTarget(loadBalancerTargetId, {
            loadBalancerId: loadBalancer.id.apply(id => parseInt(id)),
            type: "server",
            serverId: server.id.apply(id => parseInt(id)),
            usePrivateIp: true,
        }, {
            provider: provider,
            dependsOn: [loadBalancer, loadBalancerNetwork]
        });
    }

    const loadBalancerService = new hcloud.LoadBalancerService("load_balancer_service1", {
        loadBalancerId: loadBalancer.id,
        protocol: "http",
        destinationPort: 30010,
        listenPort: 80,
        http: {
        },
        healthCheck: {
            protocol: "http",
            port: 30010,
            interval: 10,
            timeout: 5,
            http: {
                path: "/healthz",
                // response: "OK",
                statusCodes: ["200"],
            },
        },
    }, {
        provider: provider,
        dependsOn: [loadBalancer]
    });
    
    //-------------------- LB: END --------------------\\

    return {loadBalancer: loadBalancer};
}
