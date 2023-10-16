const planNames = ['free', 'starter', 'pro'] as const;
type PlanName = (typeof planNames)[number];

const featureNames = ['customDomains', 'userGroups', 'catch-all'] as const;
type FeatureName = (typeof featureNames)[number];

const eeConfig = useRuntimeConfig().public.ee;

const featurePlanMap: Record<FeatureName, PlanName[]> = {
  customDomains: ['starter', 'pro'],
  userGroups: ['starter', 'pro'],
  'catch-all': ['pro']
};

const useFeature = (featureName: FeatureName, orgPlan: PlanName) => {
  if (!eeConfig.modules.billing) {
    return true;
  }
  const allowedPlans = featurePlanMap[featureName];
  return allowedPlans.includes(orgPlan);
};

export const useEE = () => {
  return {
    config: eeConfig,
    useFeature
  };
};
