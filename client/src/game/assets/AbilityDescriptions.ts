import { AbilityType } from './AbilityAssets';

export interface AbilityDescription {
  name: string;
  description: string;
  cooldown: number;
  stats: {
    [key: string]: string | number;
  };
  tips: string[];
}

export const AbilityDescriptions: Record<AbilityType, AbilityDescription> = {
  [AbilityType.RAPID_FIRE]: {
    name: 'Rapid Fire',
    description: 'Temporarily increases attack speed by 100% but reduces damage by 25%.',
    cooldown: 15,
    stats: {
      'Duration': '8s',
      'Attack Speed': '+100%',
      'Damage': '-25%'
    },
    tips: [
      'Great for dealing with swarms of weak enemies',
      'Combine with damage buffs to offset the damage reduction',
      'Use when enemies are clustered together'
    ]
  },
  [AbilityType.PIERCING]: {
    name: 'Piercing Shot',
    description: 'Next 5 shots pierce through enemies and deal bonus damage.',
    cooldown: 20,
    stats: {
      'Duration': '5 shots',
      'Pierce Count': '3',
      'Bonus Damage': '+50%'
    },
    tips: [
      'Effective against lined-up enemies',
      'Great for dealing with armored units',
      'Save for when enemies are in a straight line'
    ]
  },
  [AbilityType.MULTISHOT]: {
    name: 'Multishot',
    description: 'Fires a spread of 3 projectiles for the next 5 shots.',
    cooldown: 18,
    stats: {
      'Duration': '5 shots',
      'Projectiles': '3',
      'Spread Angle': '30°'
    },
    tips: [
      'Best used against groups of enemies',
      'Position turret where it can cover multiple paths',
      'Great for area denial'
    ]
  },
  [AbilityType.OVERCHARGE]: {
    name: 'Overcharge',
    description: 'Builds up charge over time, releasing a powerful shot that deals massive damage.',
    cooldown: 25,
    stats: {
      'Max Charge': '3 stacks',
      'Charge Time': '5s per stack',
      'Damage Bonus': '+100% per stack'
    },
    tips: [
      'Save full charges for boss enemies',
      'Start charging early before tough waves',
      'Can be used to burst down priority targets'
    ]
  },
  [AbilityType.TESLA_CHAIN]: {
    name: 'Tesla Chain',
    description: 'Lightning arcs between enemies, dealing damage and applying a slow effect.',
    cooldown: 22,
    stats: {
      'Chain Count': '4',
      'Chain Range': '150',
      'Slow Effect': '30%',
      'Slow Duration': '3s'
    },
    tips: [
      'Most effective against tightly packed enemies',
      'Chain lightning prioritizes closest targets',
      'Use to slow down fast-moving enemies'
    ]
  }
}; 