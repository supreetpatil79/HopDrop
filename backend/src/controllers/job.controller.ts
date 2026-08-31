import { Request, Response } from 'express';
import { listAvailableJobs } from '../services/job.service';
import { ApiResponse } from '../utils/ApiResponse';

export async function listAvailableJobsController(req: Request, res: Response) {
  const data = await listAvailableJobs(req.user!.id);
  res.status(200).json(new ApiResponse('Available jobs fetched', data));
}
