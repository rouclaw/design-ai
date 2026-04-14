let _billingEnabled = false;

export function setBillingEnabled(enabled: boolean) {
  _billingEnabled = enabled;
}

export function isBillingEnabled() {
  return _billingEnabled;
}

const BILLING_DISABLED_CHECK: FeatureCheck = { allowed: true, isMetered: false };
const BILLING_DISABLED_RECORD: RecordUsageResult = { success: true, newUsed: 0 };

/**
 * Feature check result from the usage API
 */
export interface FeatureCheck {
  allowed: boolean;
  isMetered: boolean;
  scope?: "per_organization" | "per_seat";
  limit?: number | "unlimited";
  used?: number;
  remaining?: number | "unlimited";
  upgradeUrl?: string;
}

/**
 * Check if a limit/remaining value is unlimited
 */
export function isUnlimited(value: number | "unlimited" | undefined): boolean {
  return value === "unlimited";
}

/**
 * Record usage result from the usage API
 */
export interface RecordUsageResult {
  success: boolean;
  newUsed: number;
}

/**
 * Check if a feature is allowed for an organization
 * @param organizationId - The organization to check
 * @param featureKey - The feature to check access for
 * @param apiBase - Base URL of the API (e.g., "https://api.pencil.dev")
 * @returns Feature check result with usage info if metered
 */
export async function checkFeature(
  organizationId: string,
  featureKey: string,
  apiBase: string,
): Promise<FeatureCheck> {
  if (!_billingEnabled) return BILLING_DISABLED_CHECK;

  try {
    const response = await fetch(`${apiBase}/api/usage/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ organizationId, featureKey }),
    });

    if (!response.ok) {
      console.error(`Feature check failed: ${response.status}`);
      return {
        allowed: false,
        isMetered: false,
      };
    }

    return await response.json();
  } catch (error) {
    console.error("Error checking feature:", error);
    return {
      allowed: false,
      isMetered: false,
    };
  }
}

/**
 * Record usage of a feature for an organization
 * @param organizationId - The organization recording usage
 * @param featureKey - The feature being used
 * @param apiBase - Base URL of the API
 * @param count - Number of units used (default: 1)
 * @returns Record result with new usage count
 */
export async function recordUsage(
  organizationId: string,
  featureKey: string,
  apiBase: string,
  count: number = 1,
): Promise<RecordUsageResult> {
  if (!_billingEnabled) return BILLING_DISABLED_RECORD;

  try {
    const response = await fetch(`${apiBase}/api/usage/record`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ organizationId, featureKey, count }),
    });

    if (!response.ok) {
      console.error(`Record usage failed: ${response.status}`);
      return {
        success: false,
        newUsed: 0,
      };
    }

    return await response.json();
  } catch (error) {
    console.error("Error recording usage:", error);
    return {
      success: false,
      newUsed: 0,
    };
  }
}

/**
 * Check a feature and record usage in one call if allowed
 * Useful for gating actions that should increment usage on success
 * @param organizationId - The organization to check
 * @param featureKey - The feature to check/record
 * @param apiBase - Base URL of the API
 * @returns Feature check result (usage already incremented if allowed)
 */
export async function checkAndRecordUsage(
  organizationId: string,
  featureKey: string,
  apiBase: string,
): Promise<FeatureCheck> {
  if (!_billingEnabled) return BILLING_DISABLED_CHECK;

  const check = await checkFeature(organizationId, featureKey, apiBase);

  if (check.allowed && check.isMetered) {
    await recordUsage(organizationId, featureKey, apiBase, 1);
    // Update local counts (unless unlimited)
    if (typeof check.remaining === "number") {
      check.remaining = Math.max(0, check.remaining - 1);
    }
    if (check.used !== undefined) {
      check.used += 1;
    }
  }

  return check;
}
