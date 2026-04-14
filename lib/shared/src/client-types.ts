export type ClientType = "desktop" | "extension" | "cli" | "web";

export type DeviceLoginMethod = "otp" | "password" | "migrate";

export type DeviceLoginStatus =
  | "user_with_password"
  | "user_no_password"
  | "migrated_new";

// Loops statuses for tokens (activation codes, verify account links, etc.)
export type TokenStatus =
  | "sent"
  | "delivered"
  | "soft-bounced"
  | "hard-bounced"
  | "spam-reported";
