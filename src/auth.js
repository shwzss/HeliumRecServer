const axios = require('axios');
const logger = require('./logger');

// These functions are intentionally generic/stubbed. Configure endpoints via env.
// STEAM: require STEAM_WEB_API_KEY to call ISteamUserAuth/AuthenticateUserTicket if you have an auth ticket.
// RECNET: set RECNET_VERIFY_URL to a RecNet endpoint that verifies tokens.

const STEAM_API_KEY = process.env.STEAM_WEB_API_KEY || '';
const RECNET_VERIFY_URL = process.env.RECNET_VERIFY_URL || '';

async function verifySteamToken(token) {
  if (!STEAM_API_KEY) throw new Error('STEAM_WEB_API_KEY not configured');
  if (!token) throw new Error('no token');

  // Example: call Steam Web API to validate an auth ticket. Replace with proper endpoint as needed.
  // This is a placeholder; Steam ticket verification requires the AuthenticateUserTicket endpoint and a ticket from client.
  const url = `https://api.steampowered.com/ISteamUserAuth/AuthenticateUserTicket/v1/?key=${STEAM_API_KEY}&ticket=${encodeURIComponent(token)}`;
  try {
    const res = await axios.get(url);
    // Properly interpret res.data based on Steam response shape
    logger.debug('Steam verify response', { data: res.data });
    // Map to a normalized user object
    return { id: res.data.response?.params?.steamid || null, provider: 'steam', raw: res.data };
  } catch (err) {
    logger.warn('Steam token verification failed', { err: err.message });
    throw err;
  }
}

async function verifyRecNetToken(token) {
  if (!RECNET_VERIFY_URL) throw new Error('RECNET_VERIFY_URL not configured');
  if (!token) throw new Error('no token');

  try {
    const res = await axios.post(RECNET_VERIFY_URL, { token });
    logger.debug('RecNet verify response', { data: res.data });
    // Map to normalized user
    return { id: res.data?.id || res.data?.userId || null, provider: 'recnet', raw: res.data };
  } catch (err) {
    logger.warn('RecNet token verification failed', { err: err.message });
    throw err;
  }
}

module.exports = { verifySteamToken, verifyRecNetToken };
