import { SetMetadata } from '@nestjs/common';
import { FeatureFlagName } from '@ple/types';

export const FEATURE_FLAG_KEY = 'featureFlag';
export const RequireFeatureFlag = (flag: FeatureFlagName) => SetMetadata(FEATURE_FLAG_KEY, flag);
