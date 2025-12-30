const crypto = require('crypto');
const dns = require('dns').promises;
const { cloudflareClient } = require('../config/cloudflare.config');
const { env } = require('../config/env');
const logger = require('../utils/logger');

/**
 * Validate domain format
 */
function validateDomain(domain) {
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
  if (!domainRegex.test(domain)) {
    throw new Error('Invalid domain format');
  }
}

/**
 * Validate token format
 */
function validateToken(token) {
  const prefix = env.DOMAIN_VERIFICATION_TOKEN_PREFIX || 'db-backup-verify';
  const tokenRegex = new RegExp(`^${prefix}-[a-f0-9]{32}$`);
  if (!tokenRegex.test(token)) {
    throw new Error('Invalid token format');
  }
}

/**
 * Generate domain verification token
 */
async function generateDomainVerificationToken(domain) {
  try {
    validateDomain(domain);

    // Generate cryptographically secure random token
    const randomHex = crypto.randomBytes(16).toString('hex');
    const prefix = env.DOMAIN_VERIFICATION_TOKEN_PREFIX || 'db-backup-verify';
    const token = `${prefix}-${randomHex}`;

    const recordPrefix = env.DOMAIN_VERIFICATION_RECORD_PREFIX || '_db-backup-verify';
    const txtRecordName = `${recordPrefix}.${domain}`;

    logger.success(`Verification token generated for domain: ${domain}`);

    return {
      success: true,
      message: 'Verification token generated successfully',
      data: {
        domain,
        token,
        txtRecordName,
        txtRecordValue: token,
        instructions: {
          automatic: 'Use POST /backup/domain/insert-txt to automatically create this record via Cloudflare',
          manual: `Create a TXT record with name '${txtRecordName}' and value '${token}' in your DNS provider`,
        },
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    logger.error('Token generation error:', error);
    throw new Error(`Failed to generate token: ${error.message}`);
  }
}

/**
 * Insert TXT record via Cloudflare API
 */
async function insertDomainTxtRecord(domain, content, recordName = '@', ttl = 120, zoneId = null) {
  try {
    validateDomain(domain);

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      throw new Error('Content is required and must be a non-empty string');
    }

    if (!cloudflareClient) {
      throw new Error('CLOUDFLARE_API_TOKEN environment variable is required for automatic TXT record creation');
    }

    const targetZoneId = zoneId || env.CLOUDFLARE_ZONE_ID;
    if (!targetZoneId) {
      throw new Error('zoneId parameter or CLOUDFLARE_ZONE_ID environment variable is required');
    }

    // Normalize record name: '@' or empty = root domain, 'sub' = subdomain
    let finalRecordName = recordName.trim() === '@' || recordName.trim() === '' ? domain : recordName;

    // Create TXT record via Cloudflare API
    const record = await cloudflareClient.dns.records.create({
      zone_id: targetZoneId,
      type: 'TXT',
      name: finalRecordName,
      content: content,
      ttl: ttl || 120, // Default 2 minutes for faster DNS propagation
    });

    logger.success(`TXT record created for ${domain}: ${record.id}`);

    return {
      success: true,
      message: 'TXT record created successfully via Cloudflare',
      data: {
        domain,
        recordId: record.id,
        recordName: record.name,
        recordValue: record.content,
        recordType: record.type,
        ttl: record.ttl,
        zoneId: targetZoneId,
        createdAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    logger.error(`Failed to create TXT record for ${domain}:`, error);

    // Provide user-friendly error messages
    if (error.message.includes('authentication') || error.message.includes('auth')) {
      throw new Error('Cloudflare authentication failed. Check CLOUDFLARE_API_TOKEN.');
    } else if (error.message.includes('zone')) {
      throw new Error('Invalid Cloudflare Zone ID. Verify CLOUDFLARE_ZONE_ID.');
    } else {
      throw new Error(`Failed to create TXT record: ${error.message}`);
    }
  }
}

/**
 * Verify domain ownership via DNS TXT lookup
 */
async function verifyDomain(domain, token) {
  try {
    validateDomain(domain);
    validateToken(token);

    const recordPrefix = env.DOMAIN_VERIFICATION_RECORD_PREFIX || '_db-backup-verify';
    const txtRecordName = `${recordPrefix}.${domain}`;

    logger.info(`Looking up TXT records for: ${txtRecordName}`);

    // Perform DNS TXT lookup
    let txtRecords;
    try {
      txtRecords = await dns.resolveTxt(txtRecordName);
    } catch (dnsError) {
      // ENOTFOUND or ENODATA means record doesn't exist
      if (dnsError.code === 'ENOTFOUND' || dnsError.code === 'ENODATA') {
        logger.warn(`TXT record not found for ${txtRecordName}`);
        return {
          success: true,
          verified: false,
          message: 'Domain verification failed: TXT record not found or token mismatch',
          data: {
            domain,
            token,
            txtRecordName,
            foundRecords: [],
            reason: 'TXT record not found. DNS may not have propagated yet (wait 2-5 minutes) or record was not created.',
          },
        };
      }
      throw dnsError;
    }

    // Flatten TXT records (each record is an array of strings)
    const flatRecords = txtRecords.map((record) => record.join(''));
    logger.debug(`Found TXT records:`, flatRecords);

    // Check if any record matches the token
    const isVerified = flatRecords.some((record) => record === token);

    if (isVerified) {
      logger.success(`Domain ${domain} verified successfully`);
      return {
        success: true,
        verified: true,
        message: 'Domain ownership verified successfully',
        data: {
          domain,
          token,
          txtRecordName,
          foundRecords: flatRecords,
          verifiedAt: new Date().toISOString(),
        },
      };
    } else {
      logger.warn(`Domain ${domain} verification failed: token mismatch`);
      return {
        success: true,
        verified: false,
        message: 'Domain verification failed: TXT record not found or token mismatch',
        data: {
          domain,
          token,
          txtRecordName,
          foundRecords: flatRecords,
          reason: `Token mismatch. Expected '${token}' but found: ${flatRecords.join(', ')}`,
        },
      };
    }
  } catch (error) {
    logger.error(`Domain verification error for ${domain}:`, error);
    throw new Error(`Failed to verify domain: ${error.message}`);
  }
}

/**
 * Remove TXT record from Cloudflare (cleanup)
 */
async function removeDomainTxtRecord(domain, recordId, zoneId = null) {
  try {
    validateDomain(domain);

    if (!cloudflareClient) {
      throw new Error('CLOUDFLARE_API_TOKEN environment variable is required for TXT record deletion');
    }

    const targetZoneId = zoneId || env.CLOUDFLARE_ZONE_ID;
    if (!targetZoneId) {
      throw new Error('zoneId parameter or CLOUDFLARE_ZONE_ID environment variable is required');
    }

    // Delete TXT record via Cloudflare API
    await cloudflareClient.dns.records.delete(recordId, {
      zone_id: targetZoneId,
    });

    logger.success(`TXT record ${recordId} deleted for ${domain}`);

    return {
      success: true,
      message: 'TXT record deleted successfully',
      data: {
        domain,
        recordId,
        deletedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    logger.error(`Failed to delete TXT record ${recordId}:`, error);
    throw new Error(`Failed to delete TXT record: ${error.message}`);
  }
}

/**
 * Fetch domain expiration date via ICANN RDAP
 */
async function getDomainExpiration(domain) {
  const rdap = require('rdap-client');

  try {
    const result = await rdap(domain);

    // Extract expiration date from RDAP events
    const expiryEvent = result.events?.find(e => e.eventAction === 'expiration');
    const registrationEvent = result.events?.find(e => e.eventAction === 'registration');

    if (expiryEvent) {
      const expirationDate = new Date(expiryEvent.eventDate);
      const now = new Date();
      const daysUntilExpiration = Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24));

      return {
        expirationDate: expiryEvent.eventDate,
        registrationDate: registrationEvent?.eventDate,
        daysUntilExpiration,
        registrar: result.entities?.[0]?.vcardArray?.[1]?.find(v => v[0] === 'fn')?.[3]
      };
    }

    return null; // No expiration data available
  } catch (error) {
    logger.warn(`RDAP lookup failed for ${domain}:`, error.message);
    return null; // Graceful degradation
  }
}

/**
 * List all domains (zones) in Cloudflare account
 */
async function listCloudflareZones() {
  try {
    if (!cloudflareClient) {
      throw new Error('CLOUDFLARE_API_TOKEN environment variable is required to list domains');
    }

    // Fetch all zones from Cloudflare with pagination
    const allZones = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const zones = await cloudflareClient.zones.list({
        page,
        per_page: 50, // Fetch 50 zones per page
      });

      allZones.push(...zones.result);

      // Check if there are more pages
      hasMore = zones.result_info.page < zones.result_info.total_pages;
      page++;
    }

    logger.success(`Retrieved ${allZones.length} domains from Cloudflare`);

    return {
      success: true,
      message: `Found ${allZones.length} domains in your Cloudflare account`,
      count: allZones.length,
      data: allZones.map((zone) => ({
        id: zone.id,
        name: zone.name,
        status: zone.status,
        paused: zone.paused,
        type: zone.type,
        nameServers: zone.name_servers,
        createdOn: zone.created_on,
        modifiedOn: zone.modified_on,
      })),
    };
  } catch (error) {
    logger.error('Failed to list Cloudflare zones:', error);
    throw new Error(`Failed to list domains: ${error.message}`);
  }
}

/**
 * List all DNS records for a specific domain
 */
async function listDnsRecords(domain, zoneId = null) {
  try {
    if (!cloudflareClient) {
      throw new Error('CLOUDFLARE_API_TOKEN environment variable is required to list DNS records');
    }

    // If zoneId not provided, find it by domain name
    let targetZoneId = zoneId;
    if (!targetZoneId) {
      const zones = await cloudflareClient.zones.list();
      const zone = zones.result.find((z) => z.name === domain);
      if (!zone) {
        throw new Error(`Domain ${domain} not found in your Cloudflare account`);
      }
      targetZoneId = zone.id;
    }

    // Fetch all DNS records for the zone
    const records = await cloudflareClient.dns.records.list({ zone_id: targetZoneId });

    logger.success(`Retrieved ${records.result.length} DNS records for ${domain}`);

    return {
      success: true,
      message: `Found ${records.result.length} DNS records for ${domain}`,
      count: records.result.length,
      data: records.result.map((record) => ({
        id: record.id,
        type: record.type,
        name: record.name,
        content: record.content,
        ttl: record.ttl,
        proxied: record.proxied,
        createdOn: record.created_on,
        modifiedOn: record.modified_on,
        comment: record.comment,
      })),
    };
  } catch (error) {
    logger.error(`Failed to list DNS records for ${domain}:`, error);
    throw new Error(`Failed to list DNS records: ${error.message}`);
  }
}

module.exports = {
  generateDomainVerificationToken,
  insertDomainTxtRecord,
  verifyDomain,
  removeDomainTxtRecord,
  listCloudflareZones,
  listDnsRecords,
  getDomainExpiration,
};
