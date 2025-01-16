import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as digitalocean from '@pulumi/digitalocean';

export const id = process.env.DIGITAL_OCEAN_SSH_KEY_ID!;
export const name = process.env.DIGITAL_OCEAN_SSH_KEY_NAME!;

export const sshKey = digitalocean.SshKey.get(name, id);
export const getPrivateKey = () => {
  // Assuming your environment variable is named 'PRIVATE_KEY_PATH'
  const privateKeyPath = process.env.PRIVATE_KEY_PATH;

  if (!privateKeyPath) {
    console.error('The environment variable PRIVATE_KEY_PATH is not set.');
    process.exit(1); // Exit with an error code
  }

  // Handles the tilde by replacing it with the user's home directory
  const resolvedPrivateKeyPath = privateKeyPath.startsWith('~')
    ? path.join(os.homedir(), privateKeyPath.slice(1))
    : path.resolve(privateKeyPath);

  const key = fs.readFileSync(resolvedPrivateKeyPath, 'utf-8');

  return key;
};
