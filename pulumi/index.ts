import * as pulumi from "@pulumi/pulumi";
import * as hcloud from "@pulumi/hcloud";
import * as dotenv from "dotenv";
dotenv.config();

import { HCLOUD_LOCATION } from "./src/constants";
import { createNetwork } from "./src/network";
import { createSshKey } from "./src/misc";
import { createServers } from "./src/server";
import { createLoadBalancer } from "./src/lb";

const HCLOUD_TOKEN = process.env.HCLOUD_TOKEN;
if (!HCLOUD_TOKEN) {
    throw new Error("HCLOUD_TOKEN is not set in the environment variables");
}

(async () => {
    const provider = await new hcloud.Provider("primary", {
        token: HCLOUD_TOKEN,
    });

    const { network, privateSubnet, publicSubnet } = await createNetwork({
        provider: provider,
    })

    const { sshKey } = await createSshKey({
        provider: provider,
    })

    const { jumpServer, natServer, rke2Agents } = await createServers({
        provider: provider,
        network: network,
        publicSubnet: publicSubnet,
        privateSubnet: privateSubnet,
        sshKey: sshKey,
    })

    const { loadBalancer } = await createLoadBalancer({
        provider: provider,
        publicSubnet: publicSubnet,
        servers: rke2Agents,
    })

})();