import { expect, test } from '@playwright/test';
import {
  createCarrierTrip,
  createDemoSessions,
  createPaidMatchedFlow,
  ensureStackHealthy,
  getMatch
} from './helpers/api';
import { preparePortalContext, selectRouteSuggestion, toDateTimeLocal } from './helpers/ui';

test.describe.configure({ mode: 'serial' });

test('sender can submit a delivery request and see matching trips', async ({ context, page, request }) => {
  await ensureStackHealthy(request);
  const sessions = await createDemoSessions(request);
  await preparePortalContext(context, sessions);
  await createCarrierTrip(request, sessions.carrier.accessToken, {
    descriptionSuffix: `sender${Date.now().toString(36)}`
  });

  await page.goto('/send-package');

  await expect(page.getByRole('heading', { name: 'Send Package' })).toBeVisible();
  await page.getByRole('spinbutton', { name: 'Weight (kg)' }).fill('2');
  await page.getByRole('textbox', { name: 'Description' }).fill(`Playwright sender package ${Date.now().toString(36)}`);
  await page.getByRole('button', { name: 'Next' }).click();

  await selectRouteSuggestion(page, 'Origin City', 'Delh', 'Delhi');
  await selectRouteSuggestion(page, 'Destination City', 'Dehr', 'Dehradun');
  await expect(page.getByText(/Map preview is unavailable/i).first()).toBeVisible();

  await page.getByRole('textbox', { name: 'Recipient Name' }).fill('Receiver One');
  await page.getByRole('textbox', { name: 'Recipient Phone' }).fill('9876543210');
  await page.getByRole('textbox', { name: 'Recipient Address' }).fill('Clock Tower, Dehradun');
  await page.getByLabel('Earliest Pickup').fill(toDateTimeLocal(new Date(Date.now() + 24 * 60 * 60 * 1000)));
  await page.getByLabel('Latest Pickup').fill(toDateTimeLocal(new Date(Date.now() + 72 * 60 * 60 * 1000)));
  await page.getByRole('button', { name: 'Next' }).click();

  await expect(page.getByText('Live carrier availability')).toBeVisible();
  await expect(page.getByText(/verified carrier/i)).toBeVisible();
  await Promise.all([
    page.waitForURL(/\/browse-trips\?requestId=/),
    page.getByRole('button', { name: 'Submit & Find Carriers' }).click({ force: true, noWaitAfter: true })
  ]);
  await expect(page.getByRole('heading', { name: 'Browse Matching Trips' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Request Carrier' }).first()).toBeVisible({ timeout: 30000 });
});

test('carrier can post a trip through the browser flow', async ({ context, page, request }) => {
  await ensureStackHealthy(request);
  const sessions = await createDemoSessions(request);
  await preparePortalContext(context, sessions);

  await page.goto('/carrier/post-trip');

  await expect(page.getByRole('heading', { name: 'Post Trip' })).toBeVisible();
  await selectRouteSuggestion(page, 'Origin City', 'Jai', 'Jaipur');
  await selectRouteSuggestion(page, 'Destination City', 'Koc', 'Kochi');
  await expect(page.getByText(/Map preview is unavailable/i).first()).toBeVisible();
  await page.getByRole('button', { name: 'Next →' }).click();

  await page.getByLabel('Departure Date & Time').fill(toDateTimeLocal(new Date(Date.now() + 48 * 60 * 60 * 1000)));
  await page.getByLabel('Estimated Arrival (optional)').fill(toDateTimeLocal(new Date(Date.now() + 54 * 60 * 60 * 1000)));
  await page.getByLabel('Transport Name').fill(`Playwright Kochi Run ${Date.now().toString(36)}`);
  await page.getByLabel('PNR / Booking Reference').fill(`PW${Date.now().toString(36).slice(-6).toUpperCase()}`);
  await page.getByRole('button', { name: 'Next →' }).click();

  await page.getByLabel('Pickup Instructions').fill('Platform 3');
  await page.getByRole('button', { name: 'Next →' }).click();

  await expect(page.getByText('TRIP SUMMARY')).toBeVisible();
  await Promise.all([
    page.waitForURL(/\/carrier\/my-trips$/),
    page.getByRole('button', { name: /Pay ₹500 Safety Deposit & Post Trip/i }).click({ force: true, noWaitAfter: true })
  ]);
  await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible();
  await expect(page.getByText('Jaipur → Kochi').first()).toBeVisible();
});

test('sender and carrier can complete the matched handoff flow across both portals', async ({ browser, context, request }) => {
  await ensureStackHealthy(request);
  const sessions = await createDemoSessions(request);
  await preparePortalContext(context, sessions);

  const description = `Playwright matched package ${Date.now().toString(36)}`;
  const flow = await createPaidMatchedFlow(request, sessions, { description });

  const senderPage = await context.newPage();
  const carrierPage = await context.newPage();

  await carrierPage.goto('/carrier/incoming-requests');
  const incomingCard = carrierPage
    .locator(`xpath=//div[contains(@class,"border-primary/20")][.//*[contains(normalize-space(.),"${description}")]]`)
    .first();
  await expect(incomingCard).toBeVisible();
  await incomingCard.getByRole('button', { name: 'Accept Match' }).click();

  await senderPage.goto(`/track-delivery/${flow.matchId}`);
  await expect(senderPage.getByRole('button', { name: 'Confirm Carrier' })).toBeVisible({ timeout: 20000 });
  await expect(senderPage.getByText(description)).toBeVisible();
  await senderPage.getByRole('button', { name: 'Confirm Carrier' }).click();

  await carrierPage.goto(`/carrier/active-delivery/${flow.matchId}`);
  await expect(carrierPage.getByRole('button', { name: 'Generate Pickup OTP' })).toBeVisible();
  await carrierPage.getByRole('button', { name: 'Generate Pickup OTP' }).click();
  const pickupOtp = ((await carrierPage.getByTestId('otp-value').first().textContent()) || '').replace(/\D/g, '');
  expect(pickupOtp).toHaveLength(6);

  await senderPage.reload();
  await senderPage.getByLabel('Enter Pickup OTP').fill(pickupOtp);
  await senderPage.getByRole('button', { name: 'Verify Pickup OTP' }).click();

  await carrierPage.reload();
  await expect(carrierPage.getByRole('button', { name: 'Generate Delivery OTP' })).toBeVisible();
  await carrierPage.getByRole('button', { name: 'Generate Delivery OTP' }).click();
  const deliveryOtp = ((await carrierPage.getByTestId('otp-value').first().textContent()) || '').replace(/\D/g, '');
  expect(deliveryOtp).toHaveLength(6);

  await senderPage.reload();
  await senderPage.getByLabel('Enter Delivery OTP').fill(deliveryOtp);
  await senderPage.getByRole('button', { name: 'Verify Delivery OTP' }).click();

  await expect
    .poll(async () => {
      const finalMatch = await getMatch(request, sessions.sender.accessToken, flow.matchId);
      return finalMatch.status;
    }, { timeout: 15000 })
    .toBe('delivered');

  await senderPage.close();
  await carrierPage.close();
  await browser.close();
});
