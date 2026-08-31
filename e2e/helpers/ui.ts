import { expect, type BrowserContext, type Page } from '@playwright/test';
import type { DemoSession } from './api';

function persistedAuthState(session: DemoSession) {
  return JSON.stringify({
    state: {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: session.user
    },
    version: 0
  });
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function preparePortalContext(
  context: BrowserContext,
  sessions: {
    carrier: DemoSession;
    sender: DemoSession;
  }
) {
  await context.route('https://apis.mappls.com/**', (route) => route.abort());
  await context.route('https://checkout.razorpay.com/**', (route) => route.abort());

  const senderState = persistedAuthState(sessions.sender);
  const carrierState = persistedAuthState(sessions.carrier);

  await context.addInitScript(
    ({ carrier, sender }) => {
      window.localStorage.setItem('hopdrop-carrier-auth', carrier);
      window.localStorage.setItem('hopdrop-sender-auth', sender);
    },
    { carrier: carrierState, sender: senderState }
  );
}

export function toDateTimeLocal(date: Date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return offsetDate.toISOString().slice(0, 16);
}

export async function selectRouteSuggestion(page: Page, label: string, query: string, optionText: string) {
  const input = page.getByLabel(new RegExp(`^${escapeRegex(label)}$`, 'i'));
  await expect(input).toBeVisible();
  await input.fill(query);

  const option = page
    .getByRole('option', {
      name: new RegExp(`\\b${escapeRegex(optionText)}\\b`, 'i')
    })
    .first();

  await expect(option).toBeVisible();
  await option.click();
  await expect(input).toHaveValue(optionText);
}
