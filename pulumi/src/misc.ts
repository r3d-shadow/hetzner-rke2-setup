import * as pulumi from "@pulumi/pulumi";
import * as hcloud from "@pulumi/hcloud";
import { HCLOUD_RESOURCES_NAME, DEFAULT_LABELS, SSH_PUB } from "./constants";

export async function createSshKey({ provider }: { provider: hcloud.Provider }): Promise<{ 
        sshKey: hcloud.SshKey
    }> {

    const sshKey = await new hcloud.SshKey("primary-ssh-key", {
        name: HCLOUD_RESOURCES_NAME,
        publicKey: SSH_PUB,
        labels: DEFAULT_LABELS
    }, { provider });

    return {
        sshKey: sshKey
    };
}
