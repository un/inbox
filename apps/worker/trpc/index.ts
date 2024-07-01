import { jobsRouter } from './routers/jobs-router';
import { router } from './trpc';

export const workerRouter = router({
  jobs: jobsRouter
});

export type TrpcWorkerRouter = typeof workerRouter;
