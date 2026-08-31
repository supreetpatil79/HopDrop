import mongoose, { ClientSession } from 'mongoose';

export function isTransactionUnsupported(error: any) {
  const message = String(error?.message || '');
  return error?.code === 20 || message.includes('Transaction numbers are only allowed on a replica set member or mongos');
}

export function isWriteConflictOrTransient(error: any) {
  const message = String(error?.message || '');
  return (
    error?.code === 112 ||
    error?.hasErrorLabel?.('TransientTransactionError') ||
    error?.hasErrorLabel?.('UnknownTransactionCommitResult') ||
    message.includes('Write conflict') ||
    message.includes('WriteConflict')
  );
}

export async function runInTransaction<T>(
  fn: (session?: ClientSession) => Promise<T>,
  maxRetries = 5
): Promise<T> {
  let session: ClientSession | null = null;
  try {
    session = await mongoose.startSession();
  } catch (error) {
    if (isTransactionUnsupported(error)) {
      return fn();
    }
    throw error;
  }

  try {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        session.startTransaction();
        const result = await fn(session);
        await session.commitTransaction();
        return result;
      } catch (innerError) {
        await session.abortTransaction().catch(() => {});
        if (isTransactionUnsupported(innerError)) {
          return fn();
        }
        if (isWriteConflictOrTransient(innerError) && attempt < maxRetries) {
          const delay = Math.min(25 * Math.pow(2, attempt) + Math.random() * 30, 400);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw innerError;
      }
    }
    throw new Error('Transaction max retries exceeded');
  } finally {
    session.endSession();
  }
}
