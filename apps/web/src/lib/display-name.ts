// Mirrors apps/web/src/app/api/me/route.ts's stableDisplayName — same deterministic
// function of the user id, so client-rendered author labels match what /api/me assigns
// server-side, without needing a users-lookup API route.
const ADJECTIVES = ['Amber','Bright','Calm','Deft','Eager','Fair','Gentle','Honest','Keen','Lively','Merry','Noble','Quiet','Rapid','Swift','Warm'];
const ANIMALS    = ['Badger','Crane','Falcon','Heron','Jaguar','Lynx','Marten','Newt','Otter','Panda','Quail','Raven','Swift','Tiger','Vole','Wren'];

export function displayNameFor(userId: string, currentUserId?: string | null): string {
  if (currentUserId && userId === currentUserId) return "You";
  const seed = userId.replace(/-/g, "").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return `${ADJECTIVES[seed % ADJECTIVES.length]} ${ANIMALS[(seed >> 4) % ANIMALS.length]}`;
}
