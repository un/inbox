import {
  Queue,
  Worker,
  type Job,
  type QueueOptions,
  type WorkerOptions
} from 'bullmq';
import { env } from '../env';

const { host, username, password, port } = new URL(
  env.DB_REDIS_CONNECTION_STRING
);

const connection = {
  host: host.split(':')[0],
  port: Number(port),
  username,
  password
};

export function createQueue<T = null>(
  name: string,
  options: Omit<QueueOptions, 'connection'> = {}
) {
  const queue = new Queue<T>(name, {
    connection,
    ...options
  });
  return queue;
}

export function createWorker<T = null>(
  name: string,
  jobHandler: (job: Job<T>) => Promise<void>,
  options: Omit<WorkerOptions, 'connection'> = {}
) {
  const worker = new Worker<T>(name, jobHandler, {
    connection,
    ...options
  });
  worker.on('error', (error) => {
    console.error(`Worker for queue ${name} encountered an error:`, error);
  });
  return worker;
}
