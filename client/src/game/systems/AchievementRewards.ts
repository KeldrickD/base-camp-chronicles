import CombatSystem from './CombatSystem';

export interface AchievementReward {
  id: string;
  name: string;
  description: string;
  icon: string;
  effect: (combatSystem: CombatSystem) => void;
  isActive: boolean;
}

export class AchievementRewards {
  private static instance: AchievementRewards;
  private combatSystem: CombatSystem;
  private rewards: Map<string, AchievementReward> = new Map();

  private constructor() {
    this.combatSystem = CombatSystem.getInstance();
    this.initializeRewards();
  }

  static getInstance(): AchievementRewards {
    if (!AchievementRewards.instance) {
      AchievementRewards.instance = new AchievementRewards();
    }
    return AchievementRewards.instance;
  }

  private initializeRewards() {
    const rewardsList: AchievementReward[] = [
      {
        id: 'brittle_master_reward',
        name: 'Enhanced Brittle',
        description: 'Brittle effect now increases burn damage by 75% (up from 50%)',
        icon: '🔥+',
        isActive: false,
        effect: (combatSystem) => {
          // This will be handled in CombatSystem's brittle effect logic
        }
      },
      {
        id: 'explosion_expert_reward',
        name: 'Chain Reaction',
        description: 'Explosion combo has 30% larger radius and can trigger additional explosions',
        icon: '💫+',
        isActive: false,
        effect: (combatSystem) => {
          // This will be handled in CombatSystem's explosion effect logic
        }
      },
      {
        id: 'frost_lord_reward',
        name: 'Deep Freeze',
        description: 'Frozen effect duration increased by 100% (up from 50%)',
        icon: '❄️+',
        isActive: false,
        effect: (combatSystem) => {
          // This will be handled in CombatSystem's frozen effect logic
        }
      },
      {
        id: 'supernova_initiate_reward',
        name: 'Stellar Core',
        description: 'Supernova now creates 4 damage waves (up from 3)',
        icon: '☀️+',
        isActive: false,
        effect: (combatSystem) => {
          // This will be handled in CombatSystem's supernova effect logic
        }
      },
      {
        id: 'combo_chain_reward',
        name: 'Combo Mastery',
        description: 'All combo effects last 25% longer',
        icon: '⚡+',
        isActive: false,
        effect: (combatSystem) => {
          // This will be handled in CombatSystem's effect duration logic
        }
      }
    ];

    rewardsList.forEach(reward => {
      this.rewards.set(reward.id, reward);
    });
  }

  unlockReward(achievementId: string): AchievementReward | undefined {
    const rewardId = `${achievementId}_reward`;
    const reward = this.rewards.get(rewardId);
    
    if (reward && !reward.isActive) {
      reward.isActive = true;
      reward.effect(this.combatSystem);
      return reward;
    }
    
    return undefined;
  }

  isRewardActive(rewardId: string): boolean {
    return this.rewards.get(rewardId)?.isActive || false;
  }

  getActiveRewards(): AchievementReward[] {
    return Array.from(this.rewards.values()).filter(reward => reward.isActive);
  }

  getAllRewards(): AchievementReward[] {
    return Array.from(this.rewards.values());
  }
} 