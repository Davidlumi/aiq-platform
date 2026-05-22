import { REWARD_INITIATIVE_LIBRARY } from './shared/rewardInitiativeLibrary.js';
const missing = REWARD_INITIATIVE_LIBRARY.filter((i) => !i.capabilityProfile);
console.log('Missing capabilityProfile:', missing.length);
console.log('Sample #1:', JSON.stringify(REWARD_INITIATIVE_LIBRARY[0].capabilityProfile));
console.log('Sample #16:', JSON.stringify(REWARD_INITIATIVE_LIBRARY[15].capabilityProfile));
console.log('Sample #30:', JSON.stringify(REWARD_INITIATIVE_LIBRARY[29].capabilityProfile));
