import type { ChildProcess } from 'node:child_process';
import { hostname } from 'node:os';
import type { ExternalOperations } from './external-operations.js';

/**
 * ADR-0031 C1 · the only process evidence the retry gate accepts is a termination OBSERVED by the parent that spawned
 * the worker on the same host (the operating system's exit event of that child). A lost lease, a missing heartbeat or
 * a suspended process is never evidence. The worker instance must have been registered with the child's PID.
 */
export function superviseWorker(child: ChildProcess, instanceId: string, operations: Pick<ExternalOperations, 'recordWorkerTermination'>) {
  const observer = `supervisor@${hostname()}:${process.pid}`;
  return new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve, reject) => {
    child.once('exit', (code, signal) => {
      operations.recordWorkerTermination(instanceId, observer).then(() => resolve({ code, signal }), reject);
    });
  });
}
