// Presentation preference only. Never use this value to grant family access.
export type FamilyRelationship = "parent" | "guardian";

export function familyRelationship(value: unknown): FamilyRelationship {
  return value === "parent" ? "parent" : "guardian";
}

export function familyControlLabel(value: unknown): string {
  return familyRelationship(value) === "parent" ? "Parent Controlled" : "Guardian Controlled";
}
