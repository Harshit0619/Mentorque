export function parseOwnerQuery(ownerQuery) {
  const search = new URLSearchParams(ownerQuery);
  const userId = search.get("userId");
  const mentorId = search.get("mentorId");
  return {
    ...(userId ? { userId } : {}),
    ...(mentorId ? { mentorId } : {}),
  };
}
