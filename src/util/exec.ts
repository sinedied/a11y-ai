import { promisify } from 'node:util';
import { exec } from 'node:child_process';

export async function runCommand(command: string): Promise<string> {
  const result = await promisify(exec)(command);
  return result.stdout.toString();
}
