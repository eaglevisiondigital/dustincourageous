export function adultSignupMetadata(firstName: string, lastName: string, cellPhone: string, relationship: string, leader = false) {
  const first = firstName.trim();
  const last = lastName.trim();
  const phone = cellPhone.trim();
  if (!first || !last || first.length > 80 || last.length > 80) throw new Error("Enter the adult’s first and last name (up to 80 characters each).");
  if (!leader && relationship !== "parent" && relationship !== "guardian") throw new Error("Please choose Parent or Guardian.");
  if (phone && (!/^\+?[\d\s().-]+$/.test(phone) || phone.replace(/\D/g, "").length < 7 || phone.replace(/\D/g, "").length > 15 || phone.length > 40)) throw new Error("Enter a valid cell phone number, including the country code if outside the U.S.");
  return { first_name: first, last_name: last, display_name: first,
    ...(phone ? { adult_contact_phone: phone } : {}),
    ...(!leader ? { family_relationship: relationship } : {}) };
}
