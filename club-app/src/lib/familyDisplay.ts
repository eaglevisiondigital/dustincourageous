// Presentation preference only. Never use this value to grant family access.
export type FamilyRelationship = "parent" | "guardian";

export function familyRelationship(value: unknown): FamilyRelationship {
  return value === "parent" ? "parent" : "guardian";
}

export function familyRoleLabel(value: unknown): "Parent" | "Guardian" {
  return familyRelationship(value) === "parent" ? "Parent" : "Guardian";
}

export function familyRoleLower(value: unknown): FamilyRelationship {
  return familyRelationship(value);
}

export function familyControlLabel(value: unknown): string {
  return `${familyRoleLabel(value)} Controlled`;
}
