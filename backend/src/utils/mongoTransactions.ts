export function isTransactionUnsupported(error: any) {
  const message = String(error?.message || '');
  return error?.code === 20 || message.includes('Transaction numbers are only allowed on a replica set member or mongos');
}
