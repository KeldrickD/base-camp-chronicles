export interface MilestoneEffect {
  type: 'all_stats' | 'chain_bonus' | 'special_chain';
  value: number | string;
}

export interface MilestoneReward {
  type: 'multiplier' | 'unlock';
  effect: MilestoneEffect;
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: {
    type: 'chains' | 'achievements' | 'points';
    threshold: number;
  };
  reward: MilestoneReward;
  completed: boolean;
  timeUnlocked?: number;
}

export interface Chain {
  id: string;
  name: string;
  description: string;
  icon: string;
  completed: boolean;
}

export interface ChallengeRequirement {
  type: 'combo' | 'achievement' | 'tier';
  target: string | number;
  count: number;
  timeWindow?: number;
}

export interface ChallengeReward {
  type: 'damage' | 'range' | 'speed' | 'resources' | 'combo';
  multiplier: number;
  duration: number;
}

export interface BaseChallenge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: ChallengeRequirement;
  reward: ChallengeReward;
  active: boolean;
  progress: number;
  completed: boolean;
}

export interface Challenge extends BaseChallenge {
  difficulty: 'normal' | 'advanced' | 'expert';
  chainId?: string;
  chainPosition?: number;
  nextInChain?: string;
  timeStarted?: number;
  timeCompleted?: number;
  timeExpires?: number;
  chainBonus?: {
    type: 'damage' | 'range' | 'speed' | 'resources' | 'combo';
    multiplier: number;
    duration: number;
  };
}

export interface ChallengeChain {
  id: string;
  name: string;
  description: string;
  icon: string;
  completed: boolean;
  challenges: string[]; // Challenge IDs
  currentPosition: number; // Current position in the chain (1-based)
}

export interface ChainAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: {
    type: 'chain_mastery' | 'chain_completion';
    chainId?: string;
    count: number;
  };
  reward: {
    type: 'permanent' | 'temporary';
    effect: {
      type: 'damage' | 'range' | 'speed' | 'resources' | 'combo';
      multiplier: number;
    };
  };
  progress: number;
  completed: boolean;
  timeUnlocked?: number;
}

export interface ChainStats {
  totalChains: number;
  completedChains: number;
  totalAchievements: number;
  unlockedAchievements: number;
  chainProgress: number;
  achievementPoints: number;
} 