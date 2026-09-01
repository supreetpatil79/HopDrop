import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { env } from './config/env';
import { DeliveryRequest } from './models/DeliveryRequest';
import { Match } from './models/Match';
import { ProcessedWebhook } from './models/ProcessedWebhook';
import { Transaction } from './models/Transaction';
import { Trip } from './models/Trip';
import { User } from './models/User';
import * as otpService from './services/otp.service';
import * as outboxService from './services/outbox.service';

import app from './app';

function createAuthHeader(user: { id: string; phone?: string; roles?: string[] }) {
  const token = jwt.sign(
    {
      id: user.id,
      phone: user.phone || '9999988888',
      roles: user.roles || ['sender']
    },
    env.JWT_ACCESS_SECRET
  );
  return `Bearer ${token}`;
}

describe('Security and Authorization Contract Suite', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Unauthenticated Request Rejections (401)', () => {
    it('rejects unauthenticated requests to delivery routes', async () => {
      const response = await request(app).get('/api/v1/deliveries/my');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid or expired token');
    });

    it('rejects unauthenticated requests to match routes', async () => {
      const response = await request(app).get('/api/v1/matches/match_999');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('rejects unauthenticated requests to user profile routes', async () => {
      const response = await request(app).get('/api/v1/users/me');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Delivery IDOR & Ownership Enforcement (403)', () => {
    it('prevents sender A from accessing sender B delivery request', async () => {
      jest.spyOn(DeliveryRequest, 'findById').mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          _id: 'del_victim_1',
          sender: { toString: () => 'sender_victim' }
        })
      } as any);

      const response = await request(app)
        .get('/api/v1/deliveries/del_victim_1')
        .set('authorization', createAuthHeader({ id: 'sender_attacker' }));

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Forbidden');
    });

    it('prevents sender A from updating sender B delivery request', async () => {
      jest.spyOn(DeliveryRequest, 'findById').mockResolvedValue({
        _id: 'del_victim_1',
        sender: { toString: () => 'sender_victim' }
      } as any);

      const response = await request(app)
        .put('/api/v1/deliveries/del_victim_1')
        .set('authorization', createAuthHeader({ id: 'sender_attacker' }))
        .send({ recipient: { name: 'New Name', phone: '9876543210', address: '123 Main St' } });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('prevents sender A from cancelling sender B delivery request', async () => {
      jest.spyOn(DeliveryRequest, 'findById').mockResolvedValue({
        _id: 'del_victim_1',
        sender: { toString: () => 'sender_victim' }
      } as any);

      const response = await request(app)
        .delete('/api/v1/deliveries/del_victim_1')
        .set('authorization', createAuthHeader({ id: 'sender_attacker' }));

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Delivery OTP Role Boundary Enforcement', () => {
    it('strictly forbids carrier from self-verifying delivery OTP to prevent payout exploitation', async () => {
      jest.spyOn(Match, 'findById').mockResolvedValue({
        _id: 'match_123',
        sender: { toString: () => 'sender_owner' },
        carrier: { toString: () => 'carrier_exploiter' },
        status: 'picked_up'
      } as any);

      const response = await request(app)
        .post('/api/v1/matches/match_123/verify-delivery-otp')
        .set('authorization', createAuthHeader({ id: 'carrier_exploiter', roles: ['carrier'] }))
        .send({ otp: '123456' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Only the sender or designated recipient can verify the delivery OTP');
    });

    it('permits the sender to verify the delivery OTP', async () => {
      const mockMatch = {
        _id: 'match_123',
        sender: { toString: () => 'sender_owner' },
        carrier: { toString: () => 'carrier_worker' },
        status: 'picked_up',
        trip: 'trip_123',
        deliveryRequest: 'del_123',
        otp: { delivery: {} },
        timeline: [],
        save: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(Match, 'findById').mockResolvedValue(mockMatch as any);
      jest.spyOn(Match, 'findByIdAndUpdate').mockResolvedValue(mockMatch as any);
      jest.spyOn(Match, 'countDocuments').mockResolvedValue(0);
      jest.spyOn(DeliveryRequest, 'findByIdAndUpdate').mockResolvedValue({} as any);
      jest.spyOn(Trip, 'findByIdAndUpdate').mockResolvedValue({} as any);
      jest.spyOn(otpService, 'verifyOTP').mockResolvedValue(true);
      jest.spyOn(outboxService, 'appendOutboxEvents').mockResolvedValue([] as any);

      const response = await request(app)
        .post('/api/v1/matches/match_123/verify-delivery-otp')
        .set('authorization', createAuthHeader({ id: 'sender_owner', roles: ['sender'] }))
        .send({ otp: '123456' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Duplicate Rating Protection', () => {
    it('blocks double-rating submissions by the sender', async () => {
      jest.spyOn(Match, 'findById').mockResolvedValue({
        _id: 'match_123',
        sender: { toString: () => 'sender_1' },
        carrier: { toString: () => 'carrier_1' },
        status: 'delivered',
        rating: {
          senderRatedCarrier: { score: 5, at: new Date() }
        }
      } as any);

      const response = await request(app)
        .post('/api/v1/matches/match_123/rate')
        .set('authorization', createAuthHeader({ id: 'sender_1', roles: ['sender'] }))
        .send({ score: 4, comment: 'Changed my mind' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already submitted a rating');
    });
  });

  describe('Razorpay Webhook Signature & Replay Verification', () => {
    it('rejects webhooks with missing signature header', async () => {
      const response = await request(app)
        .post('/api/v1/payments/razorpay/webhook')
        .send({ event: 'payment.captured' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Missing webhook signature');
    });

    it('rejects webhooks with invalid HMAC signature', async () => {
      const response = await request(app)
        .post('/api/v1/payments/razorpay/webhook')
        .set('x-razorpay-signature', 'invalid_fake_signature_hex')
        .send({ event: 'payment.captured' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid webhook signature');
    });

    it('accepts webhooks with valid HMAC signature', async () => {
      const rawPayload = JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_valid_123',
              order_id: 'order_valid_123'
            }
          }
        }
      });

      const validSignature = crypto
        .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
        .update(rawPayload)
        .digest('hex');

      jest.spyOn(ProcessedWebhook, 'create').mockResolvedValue({} as any);
      jest.spyOn(Transaction, 'findOne').mockResolvedValue(null);
      jest.spyOn(Transaction, 'findOneAndUpdate').mockResolvedValue({} as any);

      const response = await request(app)
        .post('/api/v1/payments/razorpay/webhook')
        .set('x-razorpay-signature', validSignature)
        .set('content-type', 'application/json')
        .send(rawPayload);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({ received: true });
    });
  });

  describe('User Account Deactivation / GDPR Erasure (DELETE /api/v1/users/me)', () => {
    it('blocks deactivation if funds are held in escrow', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue({
        _id: 'user_1',
        wallet: { escrowHeld: 500 }
      } as any);

      const response = await request(app)
        .delete('/api/v1/users/me')
        .set('authorization', createAuthHeader({ id: 'user_1' }));

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot deactivate account with funds held in escrow');
    });

    it('blocks deactivation if active uncompleted matches exist', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue({
        _id: 'user_1',
        wallet: { escrowHeld: 0 }
      } as any);
      jest.spyOn(Match, 'countDocuments').mockResolvedValue(1);

      const response = await request(app)
        .delete('/api/v1/users/me')
        .set('authorization', createAuthHeader({ id: 'user_1' }));

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('active deliveries or trips in progress');
    });

    it('successfully deactivates user and anonymizes PII when state is clean', async () => {
      const mockUser = {
        _id: 'user_1',
        wallet: { escrowHeld: 0 },
        isActive: true,
        name: 'Supreet Patil',
        fcmToken: 'fcm_token_secret',
        save: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser as any);
      jest.spyOn(Match, 'countDocuments').mockResolvedValue(0);

      const response = await request(app)
        .delete('/api/v1/users/me')
        .set('authorization', createAuthHeader({ id: 'user_1' }));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockUser.isActive).toBe(false);
      expect(mockUser.fcmToken).toBeUndefined();
      expect(mockUser.name).toBe('Deactivated User');
      expect(mockUser.save).toHaveBeenCalled();
    });
  });
});
