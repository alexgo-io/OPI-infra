import assert from 'node:assert';
import { createHash } from 'node:crypto';
import fs, { readdirSync, readFileSync, statSync } from 'node:fs';
import path, { join } from 'node:path';
import * as digitalocean from '@pulumi/digitalocean';
import { id, name } from './keys';

export function root(filePath: string) {
  const p = path.resolve(__dirname, `../../${filePath}`);
  if (fs.existsSync(p)) {
    return p;
  }
  throw new Error(`File not found: ${p}`);
}

export function root$(filePath: string) {
  return path.resolve(__dirname, `../../${filePath}`);
}

// convert the absolute path from root(filePath: string) to relative path
// example: unroot(root(a)) === a
export function unroot(filePath: string) {
  return filePath.replace(root('') + '/', '');
}

assert(id, 'DIGITAL_OCEAN_SSH_KEY_ID is required');
assert(name, 'DIGITAL_OCEAN_SSH_KEY_NAME is required');

export function getScript(scriptName: string) {
  return fs.readFileSync(`./src/scripts/${scriptName}`, 'utf-8');
}

// write takeSnapshot function which input is the output of function create.
export function takeSnapshot(params: {
  name: string;
  volume: digitalocean.Volume;
}) {
  const { name, volume } = params;

  const createSnapshot = new digitalocean.VolumeSnapshot(`${name}-snapshot`, {
    volumeId: volume.id,
    name: `${name}-snapshot`,
  });

  exports[`volume_snapshot_${name}`] = createSnapshot.id;

  return { createSnapshot };
}

export function transformFile(
  seed: string,
  filePath: string,
  transforms: string[][],
): string {
  // Read the content of the source file
  const content = fs.readFileSync(filePath, 'utf8');

  // Apply all transformations
  let transformedContent = content;
  for (const transform of transforms) {
    const [original, replacement] = transform;
    transformedContent = transformedContent.split(original).join(replacement);
  }

  // Create a temp file in a random location
  const tempDir = createTmpDirFromSeed(filePath + seed);
  const tempFilePath = path.join(tempDir, path.basename(filePath));

  // Write the transformed content to the temp file
  fs.writeFileSync(tempFilePath, transformedContent);

  // Return the path of the temp file
  return tempFilePath;
}

const createTmpDirFromSeed = (seed: string): string => {
  const hash = createHash('sha256').update(seed).digest('hex');
  const tmpBaseDir = '/tmp';
  const dirPath = join(tmpBaseDir, hash);

  try {
    fs.mkdirSync(dirPath, { recursive: true });
    return dirPath;
  } catch (error) {
    throw new Error(`Failed to create temp directory: ${error}`);
  }
};

export function hashFile(filePath: string): string {
  const fileBuffer = readFileSync(filePath);
  const hashSum = createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

export function generateDirectoryHash(dirPath: string): string {
  let hashString = '';

  const files = readdirSync(dirPath);
  for (const file of files) {
    const filePath = join(dirPath, file);
    const fileStat = statSync(filePath);

    if (fileStat.isDirectory()) {
      hashString += `${file}:${generateDirectoryHash(filePath)}`;
    } else {
      hashString += `${file}:${hashFile(filePath)}`;
    }
  }

  const hashSum = createHash('sha256');
  hashSum.update(hashString);
  return hashSum.digest('hex');
}
