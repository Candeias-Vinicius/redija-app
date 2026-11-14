import { spawn } from 'node:child_process';
import { config } from './config.ts';
import { ImportError } from './zip.ts';

export interface PandocRunOptions {
  cwd: string;
  stdin?: string;
  timeoutMs?: number;
}

const MAX_STDOUT_BYTES = 200 * 1024 * 1024;

/**
 * Executa o Pandoc sem shell, com teto de memória (RTS -M) e timeout.
 * Nunca interpola entrada do usuário em linha de comando: só caminhos gerados pelo serviço.
 */
export function runPandoc(args: string[], options: PandocRunOptions): Promise<string> {
  const fullArgs = ['+RTS', `-M${config.pandocMaxHeap}`, '-RTS', ...args];
  const timeoutMs = options.timeoutMs ?? config.pandocTimeoutMs;

  return new Promise((resolve, reject) => {
    const child = spawn(config.pandocBin, fullArgs, {
      cwd: options.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { PATH: process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin', HOME: options.cwd, LANG: 'C.UTF-8' },
    });

    const stdoutChunks: Buffer[] = [];
    let stdoutBytes = 0;
    let stderr = '';
    let settled = false;

    const finish = (err: Error | null, out?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (err) reject(err);
      else resolve(out ?? '');
    };

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish(new ImportError('A conversão demorou demais e foi interrompida. Tente um arquivo menor.', 422));
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutBytes += chunk.byteLength;
      if (stdoutBytes > MAX_STDOUT_BYTES) {
        child.kill('SIGKILL');
        finish(new ImportError('O documento convertido ficou grande demais.', 413));
        return;
      }
      stdoutChunks.push(chunk);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      if (stderr.length < 8000) stderr += chunk.toString('utf8');
    });
    child.on('error', (err) => {
      finish(new ImportError(`Pandoc indisponível no servidor: ${err.message}`, 500));
    });
    child.on('close', (code) => {
      if (code === 0) {
        finish(null, Buffer.concat(stdoutChunks).toString('utf8'));
      } else {
        const detail = stderr.trim().split('\n').slice(0, 6).join('\n');
        finish(new ImportError(`O Pandoc não conseguiu ler o documento.${detail ? `\n${detail}` : ''}`, 422));
      }
    });

    if (options.stdin !== undefined) child.stdin.end(options.stdin, 'utf8');
    else child.stdin.end();
  });
}

export async function getPandocVersion(): Promise<string | null> {
  try {
    const out = await runPandoc(['--version'], { cwd: process.cwd(), timeoutMs: 5000 });
    return out.split('\n')[0]?.trim() ?? null;
  } catch {
    return null;
  }
}
