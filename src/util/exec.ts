import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { exec } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../');

export async function runCommand(command: string, env: Record<string, string> = {}, runInProjectRoot = false): Promise<string> {
  const result = await promisify(exec)(command, {
    env: {
      ...process.env,
      ...env,
    },
    maxBuffer: 1024 * 1024 * 10, // 10MB
    ...(runInProjectRoot ? { cwd: projectRoot } : {}),
  });
  return result.stdout.toString();
}
