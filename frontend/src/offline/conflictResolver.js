/**
 * Conflict Resolver for Offline Routes
 * Rule: Completed stops on device are preserved; remaining stops are merged/updated with dispatcher plan
 */
export function mergeRouteUpdates(localDeliveries = [], serverDeliveries = []) {
  const completedIds = new Set(
    localDeliveries
      .filter((d) => d.status === 'DELIVERED')
      .map((d) => d._id)
  );

  const merged = [];

  // 1. Keep local completed deliveries
  for (const local of localDeliveries) {
    if (completedIds.has(local._id)) {
      merged.push(local);
    }
  }

  // 2. Append new / updated deliveries from server that are not yet locally completed
  for (const serverDel of serverDeliveries) {
    if (!completedIds.has(serverDel._id)) {
      merged.push(serverDel);
    }
  }

  // Sort by stopSequence
  merged.sort((a, b) => (a.stopSequence || 0) - (b.stopSequence || 0));
  return merged;
}
