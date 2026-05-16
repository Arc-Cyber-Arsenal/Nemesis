/**
 * JWT Decoder Utility
 * Decodes and analyzes JWT tokens (Bearer tokens) client-side
 * No external dependencies - pure JavaScript implementation
 */

/**
 * Base64URL decode (JWT compatible)
 */
function base64UrlDecode(str) {
  // Replace URL-safe characters
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');

  // Pad with '=' if needed
  const pad = base64.length % 4;
  if (pad) {
    if (pad === 1) {
      throw new Error('Invalid base64url string');
    }
    base64 += '='.repeat(4 - pad);
  }

  // Decode base64
  try {
    const decoded = atob(base64);
    return decoded;
  } catch (e) {
    throw new Error('Invalid base64 encoding');
  }
}

/**
 * Decode JWT token
 * @param {string} token - JWT token string
 * @returns {Object} Decoded token with metadata
 */
export function decodeJWT(token) {
  if (!token || typeof token !== 'string') {
    return {
      valid: false,
      error: 'Token is required and must be a string'
    };
  }

  // Remove "Bearer " prefix if present
  token = token.replace(/^Bearer\s+/i, '').trim();

  // Split token into parts
  const parts = token.split('.');

  if (parts.length !== 3) {
    return {
      valid: false,
      error: 'Invalid JWT format (expected 3 parts separated by dots)'
    };
  }

  try {
    // Decode header
    const headerJson = base64UrlDecode(parts[0]);
    const header = JSON.parse(headerJson);

    // Decode payload
    const payloadJson = base64UrlDecode(parts[1]);
    const payload = JSON.parse(payloadJson);

    // Current timestamp (in seconds)
    const now = Math.floor(Date.now() / 1000);

    // Calculate expiration status
    const exp = payload.exp;
    const iat = payload.iat;
    let isExpired = null;
    let expiresIn = null;
    let expirationStatus = 'unknown';

    if (exp) {
      isExpired = exp < now;
      expiresIn = exp - now;

      if (isExpired) {
        expirationStatus = 'expired';
      } else if (expiresIn < 1800) { // < 30 minutes
        expirationStatus = 'expiring_soon';
      } else {
        expirationStatus = 'valid';
      }
    }

    // Calculate time since issuance
    let issuedAt = null;
    let age = null;
    if (iat) {
      issuedAt = new Date(iat * 1000);
      age = now - iat;
    }

    return {
      valid: true,
      header,
      payload,

      // Metadata
      algorithm: header.alg,
      type: header.typ,
      keyId: header.kid,

      // Standard claims
      issuer: payload.iss,
      subject: payload.sub,
      audience: payload.aud,
      exp: exp,
      iat: iat,
      notBefore: payload.nbf,
      jwtId: payload.jti,

      // Custom claims (vary by provider)
      roles: payload.roles || payload.role || payload.groups || [],
      scope: payload.scope,
      email: payload.email,
      name: payload.name || payload.preferred_username,

      // Expiration analysis
      isExpired,
      expiresIn,  // seconds until expiration (negative if expired)
      expirationStatus,  // 'valid', 'expiring_soon', 'expired', 'unknown'
      issuedAt,
      age,  // seconds since issuance

      // Formatted dates
      expDate: exp ? new Date(exp * 1000) : null,
      iatDate: iat ? new Date(iat * 1000) : null,
      nbfDate: payload.nbf ? new Date(payload.nbf * 1000) : null,
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message || 'Failed to decode JWT'
    };
  }
}

/**
 * Format expiration time in human-readable format
 * @param {number} seconds - Seconds until expiration (negative if expired)
 * @returns {string} Formatted time
 */
export function formatExpirationTime(seconds) {
  if (seconds === null || seconds === undefined) {
    return 'Unknown';
  }

  const absSeconds = Math.abs(seconds);

  if (absSeconds < 60) {
    return `${Math.floor(absSeconds)}s`;
  }

  if (absSeconds < 3600) {
    const minutes = Math.floor(absSeconds / 60);
    return `${minutes}m`;
  }

  if (absSeconds < 86400) {
    const hours = Math.floor(absSeconds / 3600);
    const minutes = Math.floor((absSeconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  const days = Math.floor(absSeconds / 86400);
  const hours = Math.floor((absSeconds % 86400) / 3600);
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

/**
 * Get status icon/color based on expiration status
 * @param {string} status - Expiration status
 * @returns {Object} Icon and color info
 */
export function getExpirationBadge(status) {
  switch (status) {
    case 'valid':
      return {
        icon: '🟢',
        color: 'green',
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        borderColor: 'border-green-200',
        label: 'Valid'
      };
    case 'expiring_soon':
      return {
        icon: '🟡',
        color: 'yellow',
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-700',
        borderColor: 'border-yellow-200',
        label: 'Expiring Soon'
      };
    case 'expired':
      return {
        icon: '🔴',
        color: 'red',
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        borderColor: 'border-red-200',
        label: 'Expired'
      };
    default:
      return {
        icon: '⚪',
        color: 'gray',
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-700',
        borderColor: 'border-gray-200',
        label: 'Unknown'
      };
  }
}

/**
 * Check if a credential (of any type) is expired or valid
 * @param {Object} credential - Credential object
 * @returns {Object} Status info
 */
export function getCredentialStatus(credential) {
  // Only JWT tokens can be analyzed for expiration
  if (credential.credential_type === 'bearer_token' && credential.token) {
    const decoded = decodeJWT(credential.token);

    if (!decoded.valid) {
      return {
        status: 'invalid',
        badge: getExpirationBadge('unknown'),
        message: 'Invalid JWT token'
      };
    }

    const badge = getExpirationBadge(decoded.expirationStatus);
    let message = '';

    if (decoded.isExpired) {
      const timeAgo = formatExpirationTime(Math.abs(decoded.expiresIn));
      message = `Expired ${timeAgo} ago`;
    } else if (decoded.expiresIn !== null) {
      const timeLeft = formatExpirationTime(decoded.expiresIn);
      message = `Expires in ${timeLeft}`;
    } else {
      message = 'No expiration';
    }

    return {
      status: decoded.expirationStatus,
      badge,
      message,
      decoded
    };
  }

  // Non-JWT credentials are always "valid" (no expiration check)
  return {
    status: 'valid',
    badge: getExpirationBadge('valid'),
    message: 'Active',
    decoded: null
  };
}
