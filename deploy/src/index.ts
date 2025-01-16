import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { local, remote } from '@pulumi/command';
import type { types } from '@pulumi/command';
import * as digitalocean from '@pulumi/digitalocean';
import * as pulumi from '@pulumi/pulumi';
import * as time from '@pulumiverse/time';
import YAML from 'yaml';
import {
  generateDirectoryHash,
  getScript,
  root,
  root$,
  transformFile,
  unroot,
} from './utils';

import { getPrivateKey, sshKey } from './keys';

export function provisionInstance(params: {
  name: string;
  connection: types.input.remote.ConnectionArgs;
}) {
  const { connection, name } = params;

  const setupCommands = execScriptsOnRemote(name, connection, [
    root('deploy/src/provision/configure-apt-mock.sh'),
    root('deploy/src/provision/configure-apt.sh'),
    root('deploy/src/provision/setup.sh'),
    root('deploy/src/provision/pull.sh'),
  ]);

  const reboot = new remote.Command(
    `${name}:reboot`,
    {
      connection,
      create: `bash -c 'sleep 10 && /sbin/shutdown -r now &'`,
      environment: { DEBIAN_FRONTEND: 'noninteractive' },
    },
    { dependsOn: setupCommands },
  );

  const wait = new time.Sleep(
    `${name}:wait60Seconds`,
    { createDuration: '60s' },
    {
      dependsOn: [reboot],
    },
  );

  return execScriptOnRemote(
    name,
    connection,
    root('deploy/src/provision/cleanup.sh'),
    {
      commandOpts: { dependsOn: [wait] },
    },
  );
}

export function execScriptsOnRemote(
  name: string,
  connection: types.input.remote.ConnectionArgs,
  locations: string[],
) {
  let command: remote.Command | null = null;
  const commands: remote.Command[] = [];
  for (const loc of locations) {
    if (command == null) {
      command = execScriptOnRemote(name, connection, loc);
    } else {
      command = execScriptOnRemote(name, connection, loc, {
        commandOpts: {
          dependsOn: [command],
        },
      });
    }

    commands.push(command);
  }

  return commands;
}

export function execScriptOnRemote(
  name: string,
  connection: types.input.remote.ConnectionArgs,
  loc: string,
  options: {
    cwd?: pulumi.Output<string>;
    commandOpts?: pulumi.CustomResourceOptions;
  } = {},
) {
  const createContent = fs.readFileSync(loc, 'utf-8');
  const createContentHash = createHash('md5')
    .update(createContent)
    .digest('hex');

  if (options.cwd) {
    return new remote.Command(
      `${name}:run:remote[d]: ${unroot(loc)}`,
      {
        connection,
        create: pulumi.interpolate`mkdir -p ${options.cwd};
          cd ${options.cwd};
          ${createContent}`,
        triggers: [createContentHash, loc],
      },
      {
        customTimeouts: { create: '240m' },
        ...options.commandOpts,
      },
    );
  }

  return new remote.Command(
    `${name}:run:remote: ${unroot(loc)}`,
    {
      connection,
      create: createContent,
      triggers: [createContentHash, loc],
    },
    {
      customTimeouts: { create: '240m' },
      ...options.commandOpts,
    },
  );
}

const image = 'ubuntu-22-04-x64';

export function create(params: { name: string; region: string; size: string }) {
  const { region, size, name } = params;
  const snapshotId = (() => {
    const id = process.env.OPI_VOLUME_SNAPSHOT_ID;
    return id?.length === 0 ? undefined : id;
  })();

  // create instance

  const droplet = new digitalocean.Droplet(`${name}-droplet`, {
    image,
    region,
    size,
    sshKeys: [sshKey.id],
  });
  const privateKey = getPrivateKey();

  const connection: types.input.remote.ConnectionArgs = {
    host: droplet.ipv4Address,
    user: 'root',
    privateKey,
    dialErrorLimit: 50,
  };

  const provision = provisionInstance({ name, connection });

  const copyConfigDir = (loc: string, remotePath: pulumi.Output<string>) => {
    if (!fs.existsSync(loc)) {
      throw new Error(`not found: ${loc}`);
    }
    const hash = generateDirectoryHash(loc).slice(0, 5);
    return new local.Command(`${name}:copyFiles ${unroot(loc)}`, {
      create: pulumi.interpolate`rsync -avP -e "ssh -i ${process.env.PRIVATE_KEY_PATH}" ${loc} ${connection.user}@${droplet.ipv4Address}:${remotePath}`,
      triggers: [hash, loc, remotePath],
    });
  };

  const volume = new digitalocean.Volume(
    `${name}volume`,
    {
      region,
      size: Number.parseInt(process.env.OPI_VOLUME_SIZE ?? '1000', 10),
      initialFilesystemType: 'ext4',
      snapshotId,
    },
    { dependsOn: [provision, droplet] },
  );
  // mount disk
  const volumeAttachment = new digitalocean.VolumeAttachment(
    `${name}-volume-attachment`,
    {
      dropletId: droplet.id.apply((id) => Number.parseInt(id, 10)),
      volumeId: volume.id,
    },
  );

  const volumePathPrint = new remote.Command(
    `${name}-read-volume-path`,
    {
      connection,
      create: getScript('print_mnt_name.sh'),
    },
    {
      dependsOn: [droplet, volumeAttachment, volume],
      customTimeouts: { create: '5m' },
    },
  );

  // cp restore files
  const cpRestoreDockerCompose = volumePathPrint.stdout.apply((volumeName) => {
    const localPath = transformFile(
      name,
      './src/docker-composes/restore.docker-compose.yaml',
      [
        ['${OPI_PG_DATA_PATH}', `${volumeName}/pg_data`],
        ['${OPI_IMAGE}', process.env.OPI_IMAGE!],
        ['${DB_USER}', process.env.DB_USER!],
        ['${DB_PASSWD}', process.env.DB_PASSWD!],
        ['${DB_DATABASE}', process.env.DB_DATABASE!],
        ['${WORKSPACE_ROOT}', volumeName],
        ['${ORD_DATADIR}', `${volumeName}/ord_data`],
      ],
    );

    const file = fs.readFileSync(localPath, 'utf-8');
    const hash = createHash('md5').update(file).digest('hex').slice(0, 5);
    const remotePath = `${volumeName}/restore.docker-compose.yaml`;

    return new remote.CopyFile(`${name}:restore`, {
      connection,
      localPath,
      remotePath,
      triggers: [hash, localPath],
    });
  });

  const cpConfig = copyConfigDir(
    root('configs'),
    pulumi.interpolate`${volumePathPrint.stdout}`,
  );

  // create swap space
  execScriptOnRemote(name, connection, root('deploy/src/scripts/mkswap.sh'), {
    commandOpts: { dependsOn: [provision] },
  });

  // restore pg database and ord_data
  const restore = execScriptOnRemote(
    name,
    connection,
    root('deploy/src/scripts/restore.sh'),
    {
      cwd: pulumi.interpolate`${volumePathPrint.stdout}`,
      commandOpts: {
        dependsOn: [cpConfig, cpRestoreDockerCompose],
      },
    },
  );

  // cp service docker-compose file
  /**
   * Applies transformations to the opi docker compose file, copies it to the remote volume,
   * and starts the opi docker compose stack.
   * Depends on the restore script finishing first.
   */
  volumePathPrint.stdout.apply((volumeName) => {
    const localPath = transformFile(
      name,
      './src/docker-composes/opi.docker-compose.yaml',
      [
        ['${OPI_PG_DATA_PATH}', `${volumeName}/pg_data`],
        ['${OPI_BITCOIND_PATH}', `${volumeName}/bitcoind_data`],
        ['${OPI_IMAGE}', process.env.OPI_IMAGE!],
        ['${BITCOIND_IMAGE}', process.env.BITCOIND_IMAGE!],
        ['${DB_USER}', process.env.DB_USER!],
        ['${DB_PASSWD}', process.env.DB_PASSWD!],
        ['${DB_DATABASE}', process.env.DB_DATABASE!],
        ['${WORKSPACE_ROOT}', volumeName],
        ['${BITCOIN_RPC_USER}', process.env.BITCOIN_RPC_USER!],
        ['${BITCOIN_RPC_PASSWD}', process.env.BITCOIN_RPC_PASSWD!],
        ['${BITCOIN_RPC_PORT}', process.env.BITCOIN_RPC_PORT!],
        ['${ORD_DATADIR}', `${volumeName}/ord_data`],
        ['${BITCOIN_CHAIN_FOLDER}', `${volumeName}/bitcoind_data/datadir`],
      ],
    );
    const file = fs.readFileSync(localPath, 'utf-8');
    const hash = createHash('md5').update(file).digest('hex').slice(0, 5);

    const cpDockerCompose = new remote.CopyFile(
      `${name}:cp:opi.docker-compose. -> ${volumeName}`,
      {
        connection,
        localPath,
        remotePath: `${volumeName}/opi.docker-compose.yaml`,
        triggers: [hash, localPath],
      },
      { dependsOn: [restore] },
    );

    // start opi
    new remote.Command(
      `${name}:start-opi...`,
      {
        connection,
        create: pulumi.interpolate`cd ${volumePathPrint.stdout} && docker-compose -f opi.docker-compose.yaml pull && docker-compose -f opi.docker-compose.yaml up -d`,
        triggers: [hash],
      },
      { dependsOn: [cpDockerCompose] },
    );
  });

  exports[`ip_${name}`] = droplet.ipv4Address;
  exports[`name_${name}`] = droplet.name;
  exports[`volume_id_${name}`] = volume.id;
  exports[`volume_attachment_id_${name}`] = volumeAttachment.id;
  exports[`volume_path_${name}`] = volumePathPrint.stdout;

  return { droplet, volume, name };
}

interface Instance {
  name: string;
  region: string;
  size: string;
}

function validateInstance(instance: unknown): instance is Instance {
  return (
    typeof instance === 'object' &&
    instance !== null &&
    'name' in instance &&
    'region' in instance &&
    'size' in instance &&
    typeof (instance as Instance).name === 'string' &&
    typeof (instance as Instance).region === 'string' &&
    typeof (instance as Instance).size === 'string'
  );
}

function readYamlAndCreateInstance() {
  // read yaml file
  const file = (() => {
    if (fs.existsSync(root$('deploy/src/config.user.yaml'))) {
      return fs.readFileSync(root('deploy/src/config.user.yaml'), 'utf8');
    }
    return fs.readFileSync(root('deploy/src/config.yaml'), 'utf8');
  })();

  // parse yaml file
  const data = YAML.parse(file);
  const instances = [];

  for (const serviceName in data.services) {
    // validate required fields
    const instance = {
      name: serviceName,
      region: data.services[serviceName].region,
      size: data.services[serviceName].size,
    };

    if (validateInstance(instance)) {
      // create instance and push to instances array
      instances.push(create(instance));
    } else {
      throw new Error(`Invalid instance data '${JSON.stringify(instance)}'`);
    }
  }

  return instances;
}

const instances = readYamlAndCreateInstance();

console.log(`created: ${instances.length} instances`);
