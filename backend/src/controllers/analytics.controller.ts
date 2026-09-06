import { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import {
  getAnalyticsSummary,
  getDwellByPage,
  getMatchFunnel,
  getSignupTrend,
  recordDwellEvent
} from '../services/analytics.service';

export async function analyticsLandingController(_req: Request, res: Response) {
  const [summary, funnel, dwell, trend] = await Promise.all([
    getAnalyticsSummary(),
    getMatchFunnel(),
    getDwellByPage(),
    getSignupTrend(30)
  ]);
  res.status(200).json(new ApiResponse('Analytics summary', { summary, funnel, dwell, trend }));
}

export async function analyticsSummaryController(_req: Request, res: Response) {
  const summary = await getAnalyticsSummary();
  res.status(200).json(new ApiResponse('Summary', summary));
}

export async function analyticsFunnelController(_req: Request, res: Response) {
  const funnel = await getMatchFunnel();
  res.status(200).json(new ApiResponse('Funnel', funnel));
}

export async function analyticsDwellController(_req: Request, res: Response) {
  const dwell = await getDwellByPage();
  res.status(200).json(new ApiResponse('Dwell', dwell));
}

export async function analyticsTrendController(req: Request, res: Response) {
  const days = parseInt(String(req.query.days ?? '30'), 10);
  const trend = await getSignupTrend(Math.min(Math.max(days, 1), 90));
  res.status(200).json(new ApiResponse('Trend', trend));
}

export async function recordDwellController(req: Request, res: Response) {
  const { sessionId, page, durationMs, userId } = req.body as {
    sessionId: string;
    page: string;
    durationMs: number;
    userId?: string;
  };

  if (!sessionId || !page || typeof durationMs !== 'number') {
    res.status(400).json({ error: 'Missing fields' });
    return;
  }

  await recordDwellEvent({ sessionId, page, durationMs: Math.min(durationMs, 3_600_000), userId });
  res.status(204).send();
}
