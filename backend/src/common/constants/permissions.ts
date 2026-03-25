import { AppRole } from "./roles";

export enum AppResource {
  PATIENTS = "patients",
  APPOINTMENTS = "appointments",
  PRESCRIPTIONS = "prescriptions",
  MEDICATIONS = "medications",
  NOTIFICATIONS = "notifications",
  MEDICAL_RECORDS = "medical_records",
  DASHBOARDS = "dashboards",
  SETTINGS = "settings",
  REPORTS = "reports",
}

export enum PermissionAction {
  CREATE = "create",
  VIEW = "view",
  EDIT = "edit",
  DELETE = "delete",
  APPROVE = "approve",
  ASSIGN = "assign",
  MANAGE = "manage",
}

export type PermissionScope =
  | "none"
  | "own"
  | "assigned"
  | "own_or_assigned"
  | "all";

export type PermissionMatrix = Record<
  AppRole,
  Record<AppResource, Record<PermissionAction, PermissionScope>>
>;

const denyAll = (): Record<PermissionAction, PermissionScope> => ({
  [PermissionAction.CREATE]: "none",
  [PermissionAction.VIEW]: "none",
  [PermissionAction.EDIT]: "none",
  [PermissionAction.DELETE]: "none",
  [PermissionAction.APPROVE]: "none",
  [PermissionAction.ASSIGN]: "none",
  [PermissionAction.MANAGE]: "none",
});

const createResourcePermissions = (
  overrides: Partial<Record<PermissionAction, PermissionScope>>,
): Record<PermissionAction, PermissionScope> => ({
  ...denyAll(),
  ...overrides,
});

export const rolePermissionMatrix: PermissionMatrix = {
  [AppRole.ADMIN]: {
    [AppResource.PATIENTS]: createResourcePermissions({
      create: "all",
      view: "all",
      edit: "all",
      delete: "all",
      approve: "all",
      assign: "all",
      manage: "all",
    }),
    [AppResource.APPOINTMENTS]: createResourcePermissions({
      create: "all",
      view: "all",
      edit: "all",
      delete: "all",
      approve: "all",
      assign: "all",
      manage: "all",
    }),
    [AppResource.PRESCRIPTIONS]: createResourcePermissions({
      create: "all",
      view: "all",
      edit: "all",
      delete: "all",
      approve: "all",
      assign: "all",
      manage: "all",
    }),
    [AppResource.MEDICATIONS]: createResourcePermissions({
      create: "all",
      view: "all",
      edit: "all",
      delete: "all",
      approve: "all",
      assign: "all",
      manage: "all",
    }),
    [AppResource.NOTIFICATIONS]: createResourcePermissions({
      create: "all",
      view: "all",
      edit: "all",
      delete: "all",
      approve: "all",
      assign: "all",
      manage: "all",
    }),
    [AppResource.MEDICAL_RECORDS]: createResourcePermissions({
      create: "all",
      view: "all",
      edit: "all",
      delete: "all",
      approve: "all",
      assign: "all",
      manage: "all",
    }),
    [AppResource.DASHBOARDS]: createResourcePermissions({
      view: "all",
      manage: "all",
    }),
    [AppResource.SETTINGS]: createResourcePermissions({
      view: "all",
      edit: "all",
      manage: "all",
    }),
    [AppResource.REPORTS]: createResourcePermissions({
      create: "all",
      view: "all",
      edit: "all",
      delete: "all",
      approve: "all",
      manage: "all",
    }),
  },
  [AppRole.DOCTOR]: {
    [AppResource.PATIENTS]: createResourcePermissions({
      create: "assigned",
      view: "assigned",
      edit: "assigned",
      assign: "assigned",
      manage: "assigned",
    }),
    [AppResource.APPOINTMENTS]: createResourcePermissions({
      create: "assigned",
      view: "assigned",
      edit: "assigned",
      delete: "assigned",
      approve: "assigned",
      assign: "assigned",
      manage: "assigned",
    }),
    [AppResource.PRESCRIPTIONS]: createResourcePermissions({
      create: "assigned",
      view: "assigned",
      edit: "assigned",
      delete: "assigned",
      approve: "assigned",
      manage: "assigned",
    }),
    [AppResource.MEDICATIONS]: createResourcePermissions({
      create: "assigned",
      view: "assigned",
      edit: "assigned",
      delete: "assigned",
      approve: "assigned",
      manage: "assigned",
    }),
    [AppResource.NOTIFICATIONS]: createResourcePermissions({
      create: "assigned",
      view: "own_or_assigned",
      edit: "own_or_assigned",
      delete: "own_or_assigned",
      manage: "assigned",
    }),
    [AppResource.MEDICAL_RECORDS]: createResourcePermissions({
      create: "assigned",
      view: "assigned",
      edit: "assigned",
      delete: "assigned",
      approve: "assigned",
      manage: "assigned",
    }),
    [AppResource.DASHBOARDS]: createResourcePermissions({
      view: "own",
      manage: "own",
    }),
    [AppResource.SETTINGS]: createResourcePermissions({
      view: "own",
      edit: "own",
      manage: "own",
    }),
    [AppResource.REPORTS]: createResourcePermissions({
      create: "assigned",
      view: "assigned",
      manage: "assigned",
    }),
  },
  [AppRole.PATIENT]: {
    [AppResource.PATIENTS]: createResourcePermissions({
      create: "own",
      view: "own",
      edit: "own",
      manage: "own",
    }),
    [AppResource.APPOINTMENTS]: createResourcePermissions({
      create: "own",
      view: "own",
      edit: "own",
      delete: "own",
      approve: "own",
      manage: "own",
    }),
    [AppResource.PRESCRIPTIONS]: createResourcePermissions({
      view: "own",
      approve: "own",
      manage: "own",
    }),
    [AppResource.MEDICATIONS]: createResourcePermissions({
      create: "own",
      view: "own",
      edit: "own",
      delete: "own",
      approve: "own",
      manage: "own",
    }),
    [AppResource.NOTIFICATIONS]: createResourcePermissions({
      view: "own",
      edit: "own",
      delete: "own",
      manage: "own",
    }),
    [AppResource.MEDICAL_RECORDS]: createResourcePermissions({
      view: "own",
      manage: "own",
    }),
    [AppResource.DASHBOARDS]: createResourcePermissions({
      view: "own",
      manage: "own",
    }),
    [AppResource.SETTINGS]: createResourcePermissions({
      view: "own",
      edit: "own",
      manage: "own",
    }),
    [AppResource.REPORTS]: createResourcePermissions({
      view: "own",
      manage: "own",
    }),
  },
};

export const scopeAllows = (
  grantedScope: PermissionScope,
  requiredScope: Exclude<PermissionScope, "none">,
): boolean => {
  if (grantedScope === "all") {
    return true;
  }

  if (grantedScope === requiredScope) {
    return true;
  }

  if (grantedScope === "own_or_assigned") {
    return requiredScope === "own" || requiredScope === "assigned" || requiredScope === "own_or_assigned";
  }

  return false;
};

export const hasPermission = ({
  role,
  resource,
  action,
  scope = "all",
}: {
  role: AppRole;
  resource: AppResource;
  action: PermissionAction;
  scope?: Exclude<PermissionScope, "none">;
}): boolean => {
  const grantedScope = rolePermissionMatrix[role][resource][action];
  return scopeAllows(grantedScope, scope);
};
