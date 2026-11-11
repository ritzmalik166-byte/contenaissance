// lib/permissions.ts
// Central list of permission keys used throughout the app.
// Existing permissions are kept for backward compatibility.
export const PERMISSIONS = {
  can_manage_blogs: "can_manage_blogs",
  can_manage_assets: "can_manage_assets",
  can_manage_leads: "can_manage_leads",
  // NEW permission for career management
  can_manage_careers: "can_manage_careers",
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

