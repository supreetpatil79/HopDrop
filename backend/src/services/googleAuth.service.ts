import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env';
import { User } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { issueTokens } from './auth.service';

const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export async function googleLogin(idToken: string) {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new ApiError(503, 'Google login not configured');
  }

  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID
    });
    payload = ticket.getPayload();
  } catch {
    throw new ApiError(401, 'Invalid Google token');
  }

  if (!payload || !payload.email) {
    throw new ApiError(401, 'Google token missing email');
  }

  const { email, name, sub: googleSub } = payload;

  // Upsert user — find by email or create new
  let user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    user = await User.create({
      name: name ?? email.split('@')[0],
      email: email.toLowerCase(),
      phone: `google_${googleSub}`, // placeholder — user prompted to add phone later
      phoneVerified: false,
      emailVerified: true,
      role: ['sender'],
      rating: { average: 5, count: 0 },
      wallet: { balance: 0, escrowHeld: 0 },
      governmentIdVerified: false,
      totalDeliveries: 0,
      totalTripsAsCarrier: 0,
      isActive: true
    });
  } else {
    // Mark email as verified since Google vouches for it
    if (!user.emailVerified) {
      user.emailVerified = true;
      await user.save();
    }
  }

  return issueTokens(user._id);
}
