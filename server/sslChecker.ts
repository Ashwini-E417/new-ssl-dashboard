import tls from 'tls';
import { SSLCheckResult, SSLHealthStatus } from '../src/types.js';

export function extractHostname(rawUrl: string): { hostname: string; port: number } {
  if (!rawUrl) return { hostname: '', port: 443 };

  // Remove leading/trailing whitespace, quotes, slashes
  let clean = rawUrl.trim().replace(/^["'`]|["'`]$/g, '').trim();

  // Strip protocol
  if (clean.toLowerCase().startsWith('http://')) {
    clean = clean.substring(7);
  } else if (clean.toLowerCase().startsWith('https://')) {
    clean = clean.substring(8);
  }

  // Remove trailing path, slashes, query params, hashes
  const slashIdx = clean.indexOf('/');
  if (slashIdx !== -1) {
    clean = clean.substring(0, slashIdx);
  }
  const qIdx = clean.indexOf('?');
  if (qIdx !== -1) {
    clean = clean.substring(0, qIdx);
  }
  const hashIdx = clean.indexOf('#');
  if (hashIdx !== -1) {
    clean = clean.substring(0, hashIdx);
  }

  // Strip port if present
  let port = 443;
  const colonIdx = clean.indexOf(':');
  if (colonIdx !== -1) {
    const portStr = clean.substring(colonIdx + 1);
    port = parseInt(portStr, 10) || 443;
    clean = clean.substring(0, colonIdx);
  }

  // Trim again and lowercase
  clean = clean.trim().toLowerCase();

  return { hostname: clean, port };
}

function singleTLSAttempt(
  hostname: string,
  port: number,
  timeoutMs: number
): Promise<SSLCheckResult> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    if (!hostname || !hostname.includes('.')) {
      return resolve({
        status: 'invalid',
        validTo: null,
        validFrom: null,
        daysRemaining: null,
        issuer: null,
        issuerOrg: null,
        subject: null,
        san: [],
        protocol: null,
        cipher: null,
        serialNumber: null,
        fingerprint: null,
        error: `Malformed URL / domain name: "${hostname}"`,
        lastCheckedAt: new Date().toISOString(),
        responseTimeMs: Date.now() - startTime,
      });
    }

    let resolved = false;
    let socket: tls.TLSSocket;

    const finish = (result: SSLCheckResult) => {
      if (!resolved) {
        resolved = true;
        try {
          socket.destroy();
        } catch (_) {}
        resolve(result);
      }
    };

    try {
      socket = tls.connect({
        host: hostname,
        port: port,
        servername: hostname, // Essential for SNI
        rejectUnauthorized: false, // Inspect certificate even if untrusted
        ciphers: 'ALL:@SECLEVEL=0', // Maximizes compatibility with older hostings & legacy TLS
        minVersion: 'TLSv1',
        timeout: timeoutMs,
      });
    } catch (err: any) {
      return resolve({
        status: 'invalid',
        validTo: null,
        validFrom: null,
        daysRemaining: null,
        issuer: null,
        issuerOrg: null,
        subject: null,
        san: [],
        protocol: null,
        cipher: null,
        serialNumber: null,
        fingerprint: null,
        error: `Failed to initialize TLS socket: ${err?.message || 'Socket error'}`,
        lastCheckedAt: new Date().toISOString(),
        responseTimeMs: Date.now() - startTime,
      });
    }

    socket.on('secureConnect', () => {
      const responseTimeMs = Date.now() - startTime;
      const cert = socket.getPeerCertificate(true);
      const protocol = socket.getProtocol();
      const cipherInfo = socket.getCipher();
      const cipher = cipherInfo ? `${cipherInfo.name} (${cipherInfo.version})` : null;

      if (!cert || Object.keys(cert).length === 0) {
        return finish({
          status: 'invalid',
          validTo: null,
          validFrom: null,
          daysRemaining: null,
          issuer: null,
          issuerOrg: null,
          subject: null,
          san: [],
          protocol: protocol || null,
          cipher: cipher,
          serialNumber: null,
          fingerprint: null,
          error: 'No SSL certificate returned by peer',
          lastCheckedAt: new Date().toISOString(),
          responseTimeMs,
        });
      }

      const validToDate = cert.valid_to ? new Date(cert.valid_to) : null;
      const validFromDate = cert.valid_from ? new Date(cert.valid_from) : null;
      const now = new Date();

      let daysRemaining: number | null = null;
      if (validToDate) {
        const diffMs = validToDate.getTime() - now.getTime();
        daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      }

      // Parse Subject Alternative Names (SAN)
      const sanList: string[] = [];
      if (cert.subjectaltname) {
        cert.subjectaltname.split(',').forEach((item) => {
          const trimmed = item.trim().replace(/^DNS:/i, '');
          if (trimmed && !sanList.includes(trimmed)) {
            sanList.push(trimmed);
          }
        });
      }

      // Parse Issuer info
      const rawOrg = cert.issuer?.O || cert.issuer?.org || null;
      const issuerOrg = Array.isArray(rawOrg) ? rawOrg.join(', ') : (rawOrg ? String(rawOrg) : null);
      const rawCN = cert.issuer?.CN || null;
      const issuerCN = Array.isArray(rawCN) ? rawCN.join(', ') : (rawCN ? String(rawCN) : null);
      const issuer = issuerOrg ? `${issuerOrg}${issuerCN ? ` (${issuerCN})` : ''}` : (issuerCN || 'Unknown Authority');
      const rawSubject = cert.subject?.CN || hostname;
      const subject = Array.isArray(rawSubject) ? rawSubject.join(', ') : String(rawSubject);

      let status: SSLHealthStatus = 'valid';
      let error: string | null = null;

      const authErrCode = socket.authorizationError
        ? (typeof socket.authorizationError === 'string'
            ? socket.authorizationError
            : (socket.authorizationError as any).code || (socket.authorizationError as any).message || String(socket.authorizationError))
        : null;

      if (daysRemaining !== null && daysRemaining <= 0) {
        status = 'expired';
        error = `Certificate expired ${Math.abs(daysRemaining)} day(s) ago on ${validToDate?.toDateString()}`;
      } else if (authErrCode && authErrCode !== 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY') {
        if (authErrCode.includes('ALTNAME_INVALID')) {
          status = 'invalid';
          error = `Hostname mismatch: Altname does not cover ${hostname}`;
        } else if (authErrCode.includes('EXPIRED')) {
          status = 'expired';
          error = 'Certificate is expired';
        } else {
          status = 'invalid';
          error = authErrCode.replace(/_/g, ' ');
        }
      } else if (daysRemaining !== null && daysRemaining <= 15) {
        status = 'expiring_soon';
      }

      finish({
        status,
        validTo: validToDate ? validToDate.toISOString() : null,
        validFrom: validFromDate ? validFromDate.toISOString() : null,
        daysRemaining,
        issuer,
        issuerOrg,
        subject,
        san: sanList,
        protocol: protocol || null,
        cipher,
        serialNumber: cert.serialNumber || null,
        fingerprint: cert.fingerprint256 || cert.fingerprint || null,
        error,
        lastCheckedAt: new Date().toISOString(),
        responseTimeMs,
      });
    });

    socket.on('timeout', () => {
      finish({
        status: 'invalid',
        validTo: null,
        validFrom: null,
        daysRemaining: null,
        issuer: null,
        issuerOrg: null,
        subject: null,
        san: [],
        protocol: null,
        cipher: null,
        serialNumber: null,
        fingerprint: null,
        error: `Connection timed out after ${timeoutMs}ms (Host unreachable or port 443 closed)`,
        lastCheckedAt: new Date().toISOString(),
        responseTimeMs: Date.now() - startTime,
      });
    });

    socket.on('close', (hadError) => {
      if (!resolved) {
        finish({
          status: 'invalid',
          validTo: null,
          validFrom: null,
          daysRemaining: null,
          issuer: null,
          issuerOrg: null,
          subject: null,
          san: [],
          protocol: null,
          cipher: null,
          serialNumber: null,
          fingerprint: null,
          error: hadError
            ? 'Connection closed due to socket transmission error'
            : 'Server closed connection before completing TLS handshake',
          lastCheckedAt: new Date().toISOString(),
          responseTimeMs: Date.now() - startTime,
        });
      }
    });

    socket.on('error', (err: any) => {
      let errorMsg = err.message || 'SSL/TLS Handshake failed';
      if (err.code === 'ENOTFOUND') {
        errorMsg = `DNS resolution failed: Domain not found (${hostname})`;
      } else if (err.code === 'ECONNREFUSED') {
        errorMsg = `Connection refused on port ${port} (HTTPS server not running on port 443)`;
      } else if (err.code === 'EHOSTUNREACH') {
        errorMsg = 'Host unreachable';
      } else if (err.code === 'ECONNRESET') {
        errorMsg = 'Connection reset by peer during TLS handshake';
      }

      finish({
        status: 'invalid',
        validTo: null,
        validFrom: null,
        daysRemaining: null,
        issuer: null,
        issuerOrg: null,
        subject: null,
        san: [],
        protocol: null,
        cipher: null,
        serialNumber: null,
        fingerprint: null,
        error: errorMsg,
        lastCheckedAt: new Date().toISOString(),
        responseTimeMs: Date.now() - startTime,
      });
    });
  });
}

/**
 * Enhanced checkSSLCertificate with intelligent fallback:
 * If www.domain.com fails with DNS, ECONNREFUSED or ALTNAME mismatch,
 * automatically attempts domain.com (apex), and vice versa.
 */
export async function checkSSLCertificate(rawUrl: string, timeoutMs: number = 8000): Promise<SSLCheckResult> {
  const { hostname, port } = extractHostname(rawUrl);

  // Initial check
  const firstResult = await singleTLSAttempt(hostname, port, timeoutMs);

  // If already valid or expiring soon, return immediately
  if (firstResult.status === 'valid' || firstResult.status === 'expiring_soon') {
    return firstResult;
  }

  // Check if we should attempt an alternative hostname (www <-> apex)
  let alternativeHostname: string | null = null;
  if (hostname.startsWith('www.')) {
    alternativeHostname = hostname.substring(4);
  } else if (hostname.split('.').length === 2) {
    alternativeHostname = `www.${hostname}`;
  }

  if (alternativeHostname) {
    // Check if error was DNS failure, connection refused, or altname mismatch
    const err = firstResult.error || '';
    const shouldRetry =
      err.includes('DNS resolution failed') ||
      err.includes('Connection refused') ||
      err.includes('Hostname mismatch') ||
      err.includes('closed connection');

    if (shouldRetry) {
      const fallbackResult = await singleTLSAttempt(alternativeHostname, port, timeoutMs);
      if (fallbackResult.status === 'valid' || fallbackResult.status === 'expiring_soon') {
        return {
          ...fallbackResult,
          error: null, // Clear error since fallback succeeded
        };
      }
    }
  }

  return firstResult;
}
