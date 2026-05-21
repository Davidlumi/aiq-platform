import { REWARD_INITIATIVE_LIBRARY } from './shared/rewardInitiativeLibrary';
const missing = REWARD_INITIATIVE_LIBRARY.filter((i: any) => !i.suggestedMeasures);
console.log('Missing suggestedMeasures count:', missing.length);
missing.forEach((i: any) => console.log(' -', i.number, i.id));
