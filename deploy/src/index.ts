import { createHash } from 'node:crypto';
import fs from 'node:fs';
import * as command from '@pulumi/command';
import * as pulumi from '@pulumi/pulumi';
import * as time from '@pulumiverse/time';
import { z } from 'zod';
import YAML from 'yaml';
import {
  generateDirectoryHash,
  workspace,
  transformFile,
  unroot,
} from './utils';

const BitcoindExternalSchema = z.object({
  host: z.string(),
  port: z.number(),
  rpc_user: z.string(),
  rpc_password: z.string(),
  zmq_port: z.number(),
});

const BitcoindLocalSchema = z.object({
  port: z.number(),
  rpc_user: z.string(),
  rpc_password: z.string(),
  zmq_port: z.number(),
  db_cache: z.number(),
});

const BitcoindConfigSchema = z.object({
  deploy: z.boolean(),
  external: BitcoindExternalSchema.optional(),
  local: BitcoindLocalSchema.optional(),
}).refine(
  (data) => {
    if (data.deploy) {
      return data.local !== undefined;
    }
    return data.external !== undefined;
  },
  { message: "Must provide 'local' config when deploy is true, or 'external' config when deploy is false" }
);

const InstanceSchema = z.object({
  name: z.string(),
  host: z.string(),
  user: z.string(),
  ssh_key_path: z.string(),
  data_path: z.string(),
  bitcoind: BitcoindConfigSchema.optional(),
});

type Instance = z.infer<typeof InstanceSchema>;

export async function provisionInstance(params: {
  instance: Instance;
  privateKey: string;
  dataPath: string;
}) {
  const { instance, privateKey } = params;

  // Create connection configuration with environment
  const connection: command.types.input.remote.ConnectionArgs & { environment?: Record<string, string> } = {
    host: instance.host,
    user: instance.user,
    privateKey,
    environment: {},
  };

  // Set bitcoind environment variables based on configuration
  const bitcoindEnv: Record<string, string> = {};
  if (instance.bitcoind) {
    if (instance.bitcoind.deploy) {
      // Local bitcoind configuration
      const local = instance.bitcoind.local!;
      bitcoindEnv.DEPLOY_BITCOIND = 'true';
      bitcoindEnv.BITCOIN_RPC_PORT = local.port.toString();
      bitcoindEnv.BITCOIN_RPC_USER = local.rpc_user;
      bitcoindEnv.BITCOIN_RPC_PASSWD = local.rpc_password;
      bitcoindEnv.BITCOIN_ZMQ_PORT = local.zmq_port.toString();
      bitcoindEnv.BITCOIN_DB_CACHE = local.db_cache.toString();
    } else {
      // External bitcoind configuration
      const external = instance.bitcoind.external!;
      bitcoindEnv.DEPLOY_BITCOIND = 'false';
      bitcoindEnv.BITCOIN_RPC_URL = `http://${external.host}:${external.port}`;
      bitcoindEnv.BITCOIN_RPC_USER = external.rpc_user;
      bitcoindEnv.BITCOIN_RPC_PASSWD = external.rpc_password;
      bitcoindEnv.BITCOIN_ZMQ_PORT = external.zmq_port.toString();
    }
  } else {
    // Default to deploying bitcoind locally with default settings
    bitcoindEnv.DEPLOY_BITCOIND = 'true';
    bitcoindEnv.BITCOIN_RPC_PORT = '8332';
    bitcoindEnv.BITCOIN_RPC_USER = 'bitcoin';
    bitcoindEnv.BITCOIN_RPC_PASSWD = 'password';
    bitcoindEnv.BITCOIN_ZMQ_PORT = '18543';
    bitcoindEnv.BITCOIN_DB_CACHE = '12000';
  }

  // Add bitcoind environment variables to the connection
  connection.environment = {
    ...connection.environment,
    ...bitcoindEnv,
  };

  // Execute setup commands
  const setupCommands = execScriptsOnRemote(instance.name, connection, [
    workspace('deploy/src/provision/configure-apt.sh').absolutePath,
    workspace('deploy/src/provision/setup.sh').absolutePath,
  ]);

  // Reboot and wait
  const reboot = new command.remote.Command(`${instance.name}:reboot`, {
    connection,
    create: 'sudo reboot',
  }, { dependsOn: setupCommands });

  const wait = new time.Sleep(`${instance.name}:wait60Seconds`,
    { createDuration: '60s' },
    { dependsOn: reboot }
  );

  // Cleanup
  const cleanup = execScriptOnRemote(
    instance.name,
    connection,
    workspace('deploy/src/provision/cleanup.sh').absolutePath,
    { commandOpts: { dependsOn: wait } }
  );

  return cleanup;
}

export function execScriptsOnRemote(
  name: string,
  connection: command.types.input.remote.ConnectionArgs,
  locations: string[],
) {
  let command: command.remote.Command | null = null;
  const commands: command.remote.Command[] = [];
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
  connection: command.types.input.remote.ConnectionArgs,
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
    return new command.remote.Command(
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

  return new command.remote.Command(
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

export function create(params: {
  name: string;
  host: string;
  user: string;
  sshKeyPath: string;
  dataPath: string;
}) {
  const { name, host, user, sshKeyPath, dataPath } = params;

  const connection: command.types.input.remote.ConnectionArgs = {
    host,
    user,
    privateKey: fs.readFileSync(sshKeyPath, 'utf-8'),
    dialErrorLimit: 50,
  };

  const provision = provisionInstance({
    instance: {
      name,
      host,
      user,
      ssh_key_path: sshKeyPath,
      data_path: dataPath
    },
    privateKey: connection.privateKey as string,
    dataPath
  });

  const copyConfigDir = (loc: string, remotePath: pulumi.Output<string>) => {
    if (!fs.existsSync(loc)) {
      throw new Error(`not found: ${loc}`);
    }
    const hash = generateDirectoryHash(loc).slice(0, 5);
    return new command.local.Command(`${name}:copyFiles ${unroot(loc)}`, {
      create: pulumi.interpolate`rsync -avP -e "ssh -i ${sshKeyPath}" ${loc} ${user}@${host}:${remotePath}`,
      triggers: [hash, loc, remotePath],
    });
  };

  // Create data directory
  const createDataDir = new command.remote.Command(
    `${name}-create-data-dir`,
    {
      connection,
      create: `mkdir -p ${dataPath}`,
    },
    {
      dependsOn: [provision],
    },
  );

  // cp restore files
  const cpRestoreDockerCompose = new command.remote.Command(
    `${name}:cp:restore-docker-compose`,
    {
      connection,
      create: pulumi.interpolate`mkdir -p ${dataPath} && cd ${dataPath} && cat > restore.docker-compose.yaml << 'EOL'
${transformFile(name, './src/docker-composes/restore.docker-compose.yaml', [
  ['${OPI_PG_DATA_PATH}', `${dataPath}/pg_data`],
  ['${OPI_IMAGE}', process.env.OPI_IMAGE!],
  ['${DB_USER}', process.env.DB_USER!],
  ['${DB_PASSWD}', process.env.DB_PASSWD!],
  ['${DB_DATABASE}', process.env.DB_DATABASE!],
  ['${WORKSPACE_ROOT}', dataPath],
  ['${ORD_DATADIR}', `${dataPath}/ord_data`],
])}
EOL`,
    },
    { dependsOn: [createDataDir] },
  );

  const cpConfig = copyConfigDir(workspace('configs').absolutePath, pulumi.interpolate`${dataPath}`);

  // create swap space
  execScriptOnRemote(name, connection, workspace('deploy/src/scripts/mkswap.sh').absolutePath, {
    commandOpts: { dependsOn: [provision] },
  });

  // restore pg database and ord_data
  const restore = execScriptOnRemote(
    name,
    connection,
    workspace('deploy/src/scripts/restore.sh').absolutePath,
    {
      cwd: pulumi.interpolate`${dataPath}`,
      commandOpts: {
        dependsOn: [cpConfig, cpRestoreDockerCompose],
      },
    }
  );

  // cp service docker-compose file
  const cpDockerCompose = new command.remote.Command(
    `${name}:cp:opi-docker-compose`,
    {
      connection,
      create: pulumi.interpolate`cd ${dataPath} && cat > opi.docker-compose.yaml << 'EOL'
${transformFile(name, './src/docker-composes/opi.docker-compose.yaml', [
  ['${OPI_PG_DATA_PATH}', `${dataPath}/pg_data`],
  ['${OPI_BITCOIND_PATH}', `${dataPath}/bitcoind_data`],
  ['${OPI_IMAGE}', process.env.OPI_IMAGE!],
  ['${BITCOIND_IMAGE}', process.env.BITCOIND_IMAGE!],
  ['${DB_USER}', process.env.DB_USER!],
  ['${DB_PASSWD}', process.env.DB_PASSWD!],
  ['${DB_DATABASE}', process.env.DB_DATABASE!],
  ['${WORKSPACE_ROOT}', dataPath],
  ['${BITCOIN_RPC_USER}', process.env.BITCOIN_RPC_USER!],
  ['${BITCOIN_RPC_PASSWD}', process.env.BITCOIN_RPC_PASSWD!],
  ['${BITCOIN_RPC_PORT}', process.env.BITCOIN_RPC_PORT!],
  ['${ORD_DATADIR}', `${dataPath}/ord_data`],
  ['${BITCOIN_CHAIN_FOLDER}', `${dataPath}/bitcoind_data/datadir`],
])}
EOL`,
    },
    { dependsOn: [restore] },
  );

  // start opi
  new command.remote.Command(
    `${name}:start-opi...`,
    {
      connection,
      create: pulumi.interpolate`cd ${dataPath} && docker-compose -f opi.docker-compose.yaml pull && docker-compose -f opi.docker-compose.yaml up -d`,
      triggers: [cpDockerCompose.stdout],
    },
    { dependsOn: [cpDockerCompose] },
  );

  return { name, host };
}

function readYamlAndCreateInstance() {
  // read yaml file
  const file = (() => {
    const userConfig = workspace('deploy/src/config.user.yaml', false);
    if (userConfig.exists) {
      return fs.readFileSync(userConfig.absolutePath, 'utf8');
    }
    return fs.readFileSync(workspace('deploy/src/config.yaml').absolutePath, 'utf8');
  })();

  // parse yaml file
  const data = YAML.parse(file);
  const instances = [];

  for (const serviceName in data.services) {
    try {
      // validate and parse instance data using Zod
      const instance = InstanceSchema.parse({
        name: serviceName,
        host: data.services[serviceName].host,
        user: data.services[serviceName].user,
        ssh_key_path: data.services[serviceName].ssh_key_path,
        data_path: data.services[serviceName].data_path,
        bitcoind: data.services[serviceName].bitcoind,
      });

      // create instance and push to instances array
      instances.push(
        create({
          name: instance.name,
          host: instance.host,
          user: instance.user,
          sshKeyPath: instance.ssh_key_path,
          dataPath: instance.data_path,
        }),
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid instance data for '${serviceName}': ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  return instances;
}

const instances = readYamlAndCreateInstance();

console.log(`created: ${instances.length} instances`);
