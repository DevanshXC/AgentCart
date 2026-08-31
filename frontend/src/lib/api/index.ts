export * from "./types";
export * from "./products";
export * from "./orders";
export * from "./payments";
export * from "./policies";
export * from "./activity";
export * from "./agent";
export * from "./merchant";

export async function getUserAvatar(): Promise<string> {
  const { userAvatar } = await import("@/lib/mock-data");
  return userAvatar;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getRecoveryData(): Promise<any> {
  const { recoveryTimeline, recoverySummary, recoveryExplanations } = await import("@/lib/mock-data");
  return { recoveryTimeline, recoverySummary, recoveryExplanations };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getActivityDetails(): Promise<any> {
  const { policyCheckDetail, financialSafety, agentPermissions } = await import("@/lib/mock-data");
  return { policyCheckDetail, financialSafety, agentPermissions };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getBuyerData(): Promise<any> {
  const { matchReasons, suggestions, alternatives } = await import("@/lib/mock-data");
  return { matchReasons, suggestions, alternatives };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getProductPageData(): Promise<any> {
  const { matchReasons, requirementMatching } = await import("@/lib/mock-data");
  return { matchReasons, requirementMatching };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getAuthorizeData(): Promise<any> {
  const { agentActionsPerformed, agentActionsRestricted } = await import("@/lib/mock-data");
  return { agentActionsPerformed, agentActionsRestricted };
}
