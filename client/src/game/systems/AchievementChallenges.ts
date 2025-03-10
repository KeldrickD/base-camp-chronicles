import { Scene } from 'phaser';
import { AchievementStats } from './AchievementStats';
import CombatSystem from './CombatSystem';
import {
  Challenge,
  ChallengeChain,
  ChainAchievement,
  Milestone
} from '../types/AchievementTypes';

/**
 * Manages achievement-based gameplay challenges
 */
export class AchievementChallenges {
  private static instance: AchievementChallenges;
  private scene?: Scene;
  private challenges: Map<string, Challenge> = new Map();
  private activeChallenges: Set<string> = new Set();
  private activeRewards: Map<string, Challenge> = new Map();
  private challengeTimers: Map<string, Phaser.Time.TimerEvent> = new Map();
  private challengeIndicators: Map<string, Phaser.GameObjects.Container> = new Map();
  private challengeChains: Map<string, ChallengeChain> = new Map();
  private activeChains: Set<string> = new Set();
  private chainProgress: Map<string, number> = new Map();
  
  private readonly CHALLENGE_CHECK_INTERVAL = 1000; // Check challenges every second
  private checkTimer?: Phaser.Time.TimerEvent;
  
  private playerLevel: number = 1;
  private readonly DIFFICULTY_COLORS = {
    normal: 0x3498db,   // Blue
    advanced: 0x9b59b6, // Purple
    expert: 0xe74c3c    // Red
  } as const;

  private readonly DIFFICULTY_MULTIPLIERS = {
    normal: { requirement: 1.0, reward: 1.0 },
    advanced: { requirement: 1.5, reward: 1.75 },
    expert: { requirement: 2.0, reward: 2.5 }
  } as const;
  
  #chainBonusMultiplier = 1.25; // 25% bonus for chain completion
  #chainBonusDuration = 1.5;    // 50% longer duration for chain completion
  
  private chainAchievements: Map<string, ChainAchievement> = new Map();
  private unlockedChainAchievements: Set<string> = new Set();
  
  private milestones: Map<string, Milestone> = new Map();
  private unlockedMilestones: Set<string> = new Set();
  
  private stats: AchievementStats;
  private combatSystem: CombatSystem;
  
  private constructor() {
    this.stats = AchievementStats.getInstance();
    this.combatSystem = CombatSystem.getInstance();
    this.initializeChallenges();
    this.initializeChains();
    this.initializeChainAchievements();
    this.initializeMilestones();
  }
  
  static getInstance(): AchievementChallenges {
    if (!AchievementChallenges.instance) {
      AchievementChallenges.instance = new AchievementChallenges();
    }
    return AchievementChallenges.instance;
  }
  
  setScene(scene: Scene): void {
    this.scene = scene;
    
    // Start challenge checking
    if (this.scene) {
      this.checkTimer = this.scene.time.addEvent({
        delay: this.CHALLENGE_CHECK_INTERVAL,
        callback: this.checkChallenges,
        callbackScope: this,
        loop: true
      });
    }
  }
  
  /**
   * Initialize available challenges
   */
  private initializeChallenges(): void {
    type ChainBonus = Challenge['chainBonus'];
    type Difficulty = Challenge['difficulty'];

    interface ChallengeRequirement {
      type: 'combo' | 'achievement' | 'tier';
      target: string;
      count: number;
      timeWindow?: number;
    }

    interface ChallengeReward {
      type: 'damage' | 'range' | 'speed' | 'resources' | 'combo';
      multiplier: number;
      duration: number;
    }

    interface BaseChallengeType {
      id: string;
      name: string;
      description: string;
      icon: string;
      requirement: ChallengeRequirement;
      reward: ChallengeReward;
      active: boolean;
      progress: number;
      completed: boolean;
      chainBonus?: ChainBonus;
      timeStarted?: number;
      timeCompleted?: number;
      timeExpires?: number;
    }

    const baseChallenges: BaseChallengeType[] = [
      {
        id: 'rapid_combo_master',
        name: 'Rapid Combo Master',
        description: 'Trigger different combos within 10 seconds',
        icon: '⚡',
        requirement: {
          type: 'combo',
          target: 'any',
          count: 3,
          timeWindow: 10000
        },
        reward: {
          type: 'speed',
          multiplier: 1.5,
          duration: 30000
        },
        active: false,
        progress: 0,
        completed: false
      },
      {
        id: 'brittle_specialist',
        name: 'Brittle Specialist',
        description: 'Trigger Brittle combo 5 times in 30 seconds',
        icon: '💥',
        requirement: {
          type: 'combo',
          target: 'burn,slow',
          count: 5,
          timeWindow: 30000
        },
        reward: {
          type: 'damage',
          multiplier: 2.0,
          duration: 20000
        },
        active: false,
        progress: 0,
        completed: false
      },
      {
        id: 'explosion_chain',
        name: 'Explosion Chain',
        description: 'Trigger Explosion combo 3 times in 15 seconds',
        icon: '💫',
        requirement: {
          type: 'combo',
          target: 'burn,stun',
          count: 3,
          timeWindow: 15000
        },
        reward: {
          type: 'range',
          multiplier: 1.75,
          duration: 25000
        },
        active: false,
        progress: 0,
        completed: false
      },
      
      // Achievement-based challenges
      {
        id: 'achievement_streak',
        name: 'Achievement Streak',
        description: 'Unlock 2 achievements in this session',
        icon: '🏆',
        requirement: {
          type: 'achievement',
          target: 'any',
          count: 2
        },
        reward: {
          type: 'resources',
          multiplier: 2.0,
          duration: 60000
        },
        active: false,
        progress: 0,
        completed: false
      },
      
      // Tier-based challenges
      {
        id: 'bronze_collector',
        name: 'Bronze Collector',
        description: 'Have at least 5 bronze tier achievements',
        icon: '🥉',
        requirement: {
          type: 'tier',
          target: 'bronze',
          count: 5
        },
        reward: {
          type: 'combo',
          multiplier: 1.25,
          duration: 45000
        },
        active: false,
        progress: 0,
        completed: false
      },
      {
        id: 'silver_collector',
        name: 'Silver Collector',
        description: 'Have at least 3 silver tier achievements',
        icon: '🥈',
        requirement: {
          type: 'tier',
          target: 'silver',
          count: 3
        },
        reward: {
          type: 'combo',
          multiplier: 1.5,
          duration: 45000
        },
        active: false,
        progress: 0,
        completed: false
      },
      {
        id: 'gold_collector',
        name: 'Gold Collector',
        description: 'Have at least 1 gold tier achievement',
        icon: '🥇',
        requirement: {
          type: 'tier',
          target: 'gold',
          count: 1
        },
        reward: {
          type: 'combo',
          multiplier: 2.0,
          duration: 45000
        },
        active: false,
        progress: 0,
        completed: false
      }
    ];

    // Generate challenges for each difficulty
    const allChallenges = baseChallenges.map((base): Challenge[] => {
      const chainId = this.getChainIdForChallenge(base.id);
      const createChainBonus = (multiplierBonus: number): NonNullable<ChainBonus> => ({
        type: base.reward.type,
        multiplier: base.reward.multiplier * this.getChainBonusMultiplier() * multiplierBonus,
        duration: base.reward.duration * this.getChainBonusDuration()
      });

      return [
        {
          ...base,
          difficulty: 'normal' as Difficulty,
          chainId,
          chainPosition: 1,
          nextInChain: `${base.id}_advanced`,
          chainBonus: createChainBonus(1)
        },
        {
          ...base,
          id: `${base.id}_advanced`,
          name: `${base.name} (Advanced)`,
          difficulty: 'advanced' as Difficulty,
          requirement: {
            ...base.requirement,
            count: Math.ceil(base.requirement.count * this.DIFFICULTY_MULTIPLIERS.advanced.requirement)
          },
          reward: {
            ...base.reward,
            multiplier: base.reward.multiplier * this.DIFFICULTY_MULTIPLIERS.advanced.reward
          },
          chainId,
          chainPosition: 2,
          nextInChain: `${base.id}_expert`,
          chainBonus: createChainBonus(1.5)
        },
        {
          ...base,
          id: `${base.id}_expert`,
          name: `${base.name} (Expert)`,
          difficulty: 'expert' as Difficulty,
          requirement: {
            ...base.requirement,
            count: Math.ceil(base.requirement.count * this.DIFFICULTY_MULTIPLIERS.expert.requirement)
          },
          reward: {
            ...base.reward,
            multiplier: base.reward.multiplier * this.DIFFICULTY_MULTIPLIERS.expert.reward
          },
          chainId,
          chainPosition: 3,
          chainBonus: createChainBonus(2)
        }
      ];
    }).flat();
    
    // Add challenges to map
    allChallenges.forEach(challenge => {
      this.challenges.set(challenge.id, challenge);
    });
  }
  
  /**
   * Check all challenges for activation and completion
   */
  private checkChallenges(): void {
    if (!this.scene) return;
    
    const currentTime = this.scene.time.now;
    const stats = this.stats.getStats();
    
    // Check each challenge
    this.challenges.forEach(challenge => {
      // Skip already completed challenges
      if (challenge.completed) return;
      
      // Check if challenge should be activated
      if (!challenge.active) {
        // Activate based on challenge type
        switch (challenge.requirement.type) {
          case 'tier':
            // Check tier counts
            if (challenge.requirement.target === 'bronze' && 
                stats.bronzeUnlocked >= challenge.requirement.count) {
              this.activateChallenge(challenge.id, currentTime);
            } else if (challenge.requirement.target === 'silver' && 
                stats.silverUnlocked >= challenge.requirement.count) {
              this.activateChallenge(challenge.id, currentTime);
            } else if (challenge.requirement.target === 'gold' && 
                stats.goldUnlocked >= challenge.requirement.count) {
              this.activateChallenge(challenge.id, currentTime);
            }
            break;
            
          case 'achievement':
            // Check achievement counts
            if (stats.sessionStats.achievementsThisSession.length > 0) {
              this.activateChallenge(challenge.id, currentTime);
            }
            break;
            
          case 'combo':
            // Combo challenges are always active
            this.activateChallenge(challenge.id, currentTime);
            break;
        }
      }
      
      // Update progress for active challenges
      if (challenge.active && !challenge.completed) {
        this.updateChallengeProgress(challenge, currentTime);
      }
    });
    
    // Check for expired rewards
    this.activeRewards.forEach((challenge, id) => {
      if (challenge.timeExpires && currentTime > challenge.timeExpires) {
        this.deactivateReward(id);
      }
    });
  }
  
  /**
   * Update progress for an active challenge
   */
  private updateChallengeProgress(challenge: Challenge, currentTime: number): void {
    if (!challenge.requirement) return;

    let progress = 0;
    switch (challenge.requirement.type) {
      case 'combo': {
        progress = this.getRecentComboCount(challenge.requirement.target as string);
        break;
      }
      case 'achievement': {
        progress = this.stats.getStats().totalUnlocked;
        break;
      }
      case 'tier': {
        const tierProgress = this.stats.getStats().tierProgress;
        progress = tierProgress[challenge.requirement.target as keyof typeof tierProgress] || 0;
        break;
      }
    }

    challenge.progress = Math.min(progress / challenge.requirement.count * 100, 100);
    
    if (challenge.progress >= 100 && !challenge.completed) {
      this.completeChallenge(challenge, currentTime);
    }
  }
  
  /**
   * Get count of a specific combo type within a time window
   */
  private getRecentComboCount(comboType: string): number {
    // Since we don't have direct access to recent combos, we'll use the combo stats
    const comboStats = this.stats.getStats().comboStats;
    if (comboStats.mostUsed === comboType) {
      return comboStats.mostUsedCount;
    }
    return 0;
  }
  
  /**
   * Activate a challenge
   */
  private activateChallenge(challengeId: string, currentTime: number): void {
    const challenge = this.challenges.get(challengeId);
    if (!challenge || challenge.active) return;
    
    challenge.active = true;
    challenge.timeStarted = currentTime;
    challenge.progress = 0;
    
    // Add to active challenges
    this.activeChallenges.add(challengeId);
    
    // Create challenge indicator
    this.createChallengeIndicator(challenge);
    
    // Announce challenge
    this.announceChallenge(challenge, 'activated');
  }
  
  /**
   * Complete a challenge and activate its reward
   */
  private completeChallenge(challenge: Challenge, currentTime: number): void {
    if (!challenge || challenge.completed) return;
    
    challenge.completed = true;
    challenge.timeCompleted = currentTime;
    
    // Update chain progress if part of a chain
    if (challenge.chainId) {
      this.updateChainProgress(challenge.chainId, challenge);
    }
    
    // Activate reward with chain bonus if applicable
    challenge.timeExpires = currentTime + (challenge.reward?.duration || 0);
    this.activeRewards.set(challenge.id, challenge);
    
    // Apply reward effect
    this.applyReward(challenge);
    
    // Announce completion
    this.announceChallenge(challenge, 'completed');
    
    // Update challenge indicator
    this.updateChallengeIndicator(challenge);
    
    // Set timer to deactivate reward
    if (this.scene && challenge.reward) {
      this.challengeTimers.set(challenge.id, this.scene.time.delayedCall(
        challenge.reward.duration,
        () => this.deactivateReward(challenge.id),
        [],
        this
      ));
    }
  }
  
  /**
   * Apply a challenge reward
   */
  private applyReward(challenge: Challenge): void {
    if (!challenge.reward) return;

    const duration = challenge.reward.duration * (this.hasChainBonus(challenge) ? this.getChainBonusMultiplier() : 1);
    const multiplier = challenge.reward.multiplier * (this.hasChainBonus(challenge) ? this.getChainBonusMultiplier() : 1);

    // Apply the reward effect
    switch (challenge.reward.type) {
      case 'damage':
      case 'combo':
        // Use the global effect multiplier for both damage and combo rewards
        this.combatSystem.setGlobalEffectMultiplier(multiplier);
        break;
      case 'range':
        this.combatSystem.setStatusSpreadRadius(multiplier);
        break;
      case 'speed':
        this.combatSystem.setComboDurationMultiplier(multiplier);
        break;
      case 'resources':
        // Resource multiplier would be handled by a different system
        break;
    }

    // Schedule reward expiration
    if (duration > 0) {
      this.scene?.time.delayedCall(duration * 1000, () => {
        this.expireReward(challenge);
      });
    }
  }
  
  /**
   * Deactivate a reward when it expires
   */
  private deactivateReward(challengeId: string): void {
    const challenge = this.activeRewards.get(challengeId);
    if (!challenge) return;
    
    // Remove from active rewards
    this.activeRewards.delete(challengeId);
    
    // Clear timer
    if (this.challengeTimers.has(challengeId)) {
      const timer = this.challengeTimers.get(challengeId);
      if (timer) timer.remove();
      this.challengeTimers.delete(challengeId);
    }
    
    // Announce expiration
    this.announceChallenge(challenge, 'expired');
    
    // Remove challenge indicator
    this.removeChallengeIndicator(challengeId);
  }
  
  /**
   * Create a visual indicator for an active challenge
   */
  private createChallengeIndicator(challenge: Challenge): void {
    if (!this.scene) return;
    
    const container = this.scene.add.container(100, 100 + this.challengeIndicators.size * 60);
    
    // Background with difficulty color
    const background = this.scene.add.rectangle(0, 0, 200, 50, 0x000000, 0.7);
    background.setStrokeStyle(2, this.DIFFICULTY_COLORS[challenge.difficulty]);
    
    // Difficulty indicator
    const difficultyText = this.scene.add.text(-90, -20, 
      challenge.difficulty.charAt(0).toUpperCase(), {
      fontSize: '12px',
      color: `#${this.DIFFICULTY_COLORS[challenge.difficulty].toString(16)}`
    }).setOrigin(0.5);
    
    // Icon
    const icon = this.scene.add.text(-80, 0, challenge.icon, { fontSize: '24px' }).setOrigin(0.5);
    
    // Name with difficulty color
    const name = this.scene.add.text(-50, -10, challenge.name, { 
      fontSize: '14px',
      color: `#${this.DIFFICULTY_COLORS[challenge.difficulty].toString(16)}`,
      fontStyle: 'bold'
    });
    
    // Progress
    const progressText = this.scene.add.text(-50, 10, 
      `Progress: ${challenge.progress}%`, {
      fontSize: '12px',
      color: '#aaaaaa'
    });
    
    // Add elements to container
    container.add([background, difficultyText, icon, name, progressText]);
    
    // Store reference
    this.challengeIndicators.set(challenge.id, container);
  }
  
  /**
   * Update a challenge indicator
   */
  private updateChallengeIndicator(challenge: Challenge): void {
    if (!this.scene || !this.challengeIndicators.has(challenge.id)) return;
    
    const container = this.challengeIndicators.get(challenge.id)!;
    
    // Update progress text
    const progressText = container.getAt(4) as Phaser.GameObjects.Text;
    progressText.setText(`Progress: ${challenge.progress}%`);
    
    // Update appearance based on state
    const background = container.getAt(0) as Phaser.GameObjects.Rectangle;
    const name = container.getAt(3) as Phaser.GameObjects.Text;
    
    if (challenge.completed) {
      // Completed challenge
      background.setStrokeStyle(2, 0x00ff00);
      name.setColor('#00ff00');
      
      // Add reward timer if active
      if (challenge.timeExpires) {
        const timeLeft = Math.max(0, Math.floor((challenge.timeExpires - (this.scene.time.now || 0)) / 1000));
        progressText.setText(`Reward: ${timeLeft}s remaining`);
      }
    } else {
      // Active challenge
      background.setStrokeStyle(2, 0xffffff);
      name.setColor('#ffffff');
    }
  }
  
  /**
   * Remove a challenge indicator
   */
  private removeChallengeIndicator(challengeId: string): void {
    if (this.challengeIndicators.has(challengeId)) {
      const indicator = this.challengeIndicators.get(challengeId);
      if (indicator) indicator.destroy();
      this.challengeIndicators.delete(challengeId);
    }
  }
  
  /**
   * Announce a challenge activation, completion, or expiration
   */
  private announceChallenge(challenge: Challenge, state: 'activated' | 'completed' | 'expired'): void {
    if (!this.scene) return;
    
    // Create announcement text
    let title = '';
    let color = 0xffffff;
    
    switch (state) {
      case 'activated':
        title = 'Challenge Available!';
        color = 0x3498db; // Blue
        break;
      case 'completed':
        title = 'Challenge Completed!';
        color = 0x2ecc71; // Green
        break;
      case 'expired':
        title = 'Reward Expired';
        color = 0xe74c3c; // Red
        break;
    }
    
    // Create popup
    const centerX = this.scene.cameras.main.width / 2;
    const centerY = this.scene.cameras.main.height / 2;
    
    const popupBg = this.scene.add.graphics();
    popupBg.fillStyle(0x000000, 0.8);
    popupBg.fillRoundedRect(centerX - 200, centerY - 60, 400, 120, 16);
    
    popupBg.lineStyle(3, color, 1);
    popupBg.strokeRoundedRect(centerX - 200, centerY - 60, 400, 120, 16);
    
    // Create title text
    const titleText = this.scene.add.text(centerX, centerY - 35, title, {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Create challenge text
    const challengeText = this.scene.add.text(centerX, centerY, 
      `${challenge.icon} ${challenge.name}`, {
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    // Create description text
    let descriptionText: string;
    if (state === 'activated') {
      descriptionText = challenge.description;
    } else if (state === 'completed') {
      descriptionText = `Reward: ${this.getRewardDescription(challenge.reward)}`;
    } else {
      descriptionText = 'Reward effect has ended';
    }
    
    const description = this.scene.add.text(centerX, centerY + 30, 
      descriptionText, {
      fontSize: '16px',
      color: '#aaaaaa'
    }).setOrigin(0.5);
    
    // Create container for all elements
    const container = this.scene.add.container(0, 0, [
      popupBg, titleText, challengeText, description
    ]);
    
    // Add entrance animation
    container.setScale(0.5);
    container.setAlpha(0);
    
    this.scene.tweens.add({
      targets: container,
      scale: 1,
      alpha: 1,
      duration: 500,
      ease: 'Back.out',
      onComplete: () => {
        // Add exit animation after delay
        this.scene?.time.delayedCall(3000, () => {
          this.scene?.tweens.add({
            targets: container,
            y: -150,
            alpha: 0,
            duration: 1000,
            onComplete: () => {
              container.destroy();
            }
          });
        });
      }
    });
  }
  
  /**
   * Get a human-readable description of a reward
   */
  private getRewardDescription(reward: Challenge['reward']): string {
    switch (reward.type) {
      case 'damage':
        return `${Math.round((reward.multiplier - 1) * 100)}% increased damage for ${reward.duration / 1000}s`;
      case 'range':
        return `${Math.round((reward.multiplier - 1) * 100)}% increased range for ${reward.duration / 1000}s`;
      case 'speed':
        return `${Math.round((reward.multiplier - 1) * 100)}% increased attack speed for ${reward.duration / 1000}s`;
      case 'resources':
        return `${Math.round((reward.multiplier - 1) * 100)}% increased resources for ${reward.duration / 1000}s`;
      case 'combo':
        return `${Math.round((reward.multiplier - 1) * 100)}% increased combo effects for ${reward.duration / 1000}s`;
      default:
        return `Reward active for ${reward.duration / 1000}s`;
    }
  }
  
  /**
   * Get all active challenges
   */
  public getActiveChallenges(): Challenge[] {
    return Array.from(this.activeChallenges)
      .map(id => this.challenges.get(id))
      .filter((challenge): challenge is Challenge => challenge !== undefined);
  }
  
  /**
   * Get all active rewards
   */
  public getActiveRewards(): Challenge[] {
    return Array.from(this.activeRewards.values());
  }
  
  /**
   * Get all challenges
   */
  getAllChallenges(): Challenge[] {
    return Array.from(this.challenges.values());
  }
  
  /**
   * Check if a specific reward is active
   */
  isRewardActive(type: string): boolean {
    return Array.from(this.activeRewards.values()).some(challenge => 
      challenge.reward.type === type
    );
  }
  
  /**
   * Get the multiplier for a specific reward type
   */
  getRewardMultiplier(type: string): number {
    const activeReward = Array.from(this.activeRewards.values()).find(challenge => 
      challenge.reward.type === type
    );
    
    return activeReward ? activeReward.reward.multiplier : 1.0;
  }
  
  /**
   * Clean up resources
   */
  destroy(): void {
    // Clear timers
    if (this.checkTimer) {
      this.checkTimer.remove();
      this.checkTimer = undefined;
    }
    
    this.challengeTimers.forEach(timer => {
      if (timer) timer.remove();
    });
    this.challengeTimers.clear();
    
    // Clear indicators
    this.challengeIndicators.forEach(indicator => {
      if (indicator) indicator.destroy();
    });
    this.challengeIndicators.clear();
    
    // Clear references
    this.scene = undefined;
    this.activeChallenges.clear();
    this.activeRewards.clear();
  }

  /**
   * Update player level based on achievements and progress
   */
  private updatePlayerLevel(): void {
    const stats = this.stats.getStats();
    // Calculate level based on total achievements and tiers
    const baseLevel = Math.floor(
      (stats.bronzeUnlocked + stats.silverUnlocked * 2 + stats.goldUnlocked * 3) / 5
    );
    this.playerLevel = Math.max(1, baseLevel);
  }

  /**
   * Get available challenges based on player level
   */
  private getAvailableChallenges(): Challenge[] {
    this.updatePlayerLevel();
    return Array.from(this.challenges.values()).filter(challenge => {
      if (this.playerLevel < 5) return challenge.difficulty === 'normal';
      if (this.playerLevel < 10) return challenge.difficulty !== 'expert';
      return true;
    });
  }

  private initializeChains(): void {
    const chains: ChallengeChain[] = [
      {
        id: 'combo_mastery',
        name: 'Combo Mastery',
        description: 'Master the art of combining effects',
        icon: '⚡',
        challenges: [
          'rapid_combo_master',
          'rapid_combo_master_advanced',
          'rapid_combo_master_expert'
        ],
        completed: false,
        currentPosition: 0
      },
      {
        id: 'brittle_mastery',
        name: 'Brittle Mastery',
        description: 'Perfect the Brittle combo technique',
        icon: '💥',
        challenges: [
          'brittle_specialist',
          'brittle_specialist_advanced',
          'brittle_specialist_expert'
        ],
        completed: false,
        currentPosition: 0
      },
      {
        id: 'explosion_mastery',
        name: 'Explosion Mastery',
        description: 'Become an explosion expert',
        icon: '💫',
        challenges: [
          'explosion_chain',
          'explosion_chain_advanced',
          'explosion_chain_expert'
        ],
        completed: false,
        currentPosition: 0
      }
    ];

    chains.forEach(chain => {
      this.challengeChains.set(chain.id, chain);
    });
  }

  private getChainIdForChallenge(baseId: string): string | undefined {
    for (const [chainId, chain] of this.challengeChains) {
      if (chain.challenges.some(id => id === baseId || id.startsWith(baseId + '_'))) {
        return chainId;
      }
    }
    return undefined;
  }

  private updateChainProgress(chainId: string, completedChallenge: Challenge): void {
    const chain = this.challengeChains.get(chainId);
    if (!chain) return;

    // Update chain position
    chain.currentPosition = Math.max(chain.currentPosition, completedChallenge.chainPosition || 0);

    // Check if this completes the chain
    if (chain.currentPosition === chain.challenges.length) {
      chain.completed = true;
      this.announceChainCompletion(chain);
      this.checkChainAchievements(chainId);
      this.checkMilestones();  // Check milestones after chain completion
    } else if (completedChallenge.nextInChain) {
      // Activate next challenge in chain if it exists
      const nextChallenge = this.challenges.get(completedChallenge.nextInChain);
      if (nextChallenge && !nextChallenge.active && !nextChallenge.completed) {
        this.activateChallenge(nextChallenge.id, this.scene?.time.now || 0);
      }
    }
  }

  private announceChainCompletion(chain: ChallengeChain): void {
    if (!this.scene) return;

    const centerX = this.scene.cameras.main.width / 2;
    const centerY = this.scene.cameras.main.height / 2;

    // Create a more elaborate celebration effect
    const particles = this.scene.add.particles(0, 0, 'particle', {
      speed: { min: 100, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      blendMode: 'ADD',
      lifespan: 1000,
      gravityY: 100
    });

    particles.setPosition(centerX, centerY);
    particles.explode(50);

    // Create announcement text with chain icon
    const title = this.scene.add.text(centerX, centerY - 50,
      `${chain.icon} Chain Mastery Achieved! ${chain.icon}`,
      { fontSize: '32px', color: '#ffd700', fontStyle: 'bold' }
    ).setOrigin(0.5);

    const description = this.scene.add.text(centerX, centerY,
      chain.name,
      { fontSize: '24px', color: '#ffffff' }
    ).setOrigin(0.5);

    const bonus = this.scene.add.text(centerX, centerY + 50,
      'Chain Bonus Unlocked: Enhanced Rewards!',
      { fontSize: '20px', color: '#2ecc71' }
    ).setOrigin(0.5);

    // Animate the announcement
    this.scene.tweens.add({
      targets: [title, description, bonus],
      y: '-=30',
      alpha: { from: 0, to: 1 },
      duration: 1000,
      ease: 'Back.out',
      onComplete: () => {
        this.scene?.time.delayedCall(3000, () => {
          this.scene?.tweens.add({
            targets: [title, description, bonus, particles],
            alpha: 0,
            duration: 1000,
            onComplete: () => {
              title.destroy();
              description.destroy();
              bonus.destroy();
              particles.destroy();
            }
          });
        });
      }
    });
  }

  /**
   * Get all challenge chains
   */
  public getAllChains(): ChallengeChain[] {
    return Array.from(this.challengeChains.values());
  }

  /**
   * Get a specific chain by ID
   */
  public getChain(chainId: string): ChallengeChain | undefined {
    return this.challengeChains.get(chainId);
  }

  /**
   * Get all challenges in a specific chain
   */
  public getChallengesInChain(chainId: string): Challenge[] {
    const chain = this.challengeChains.get(chainId);
    if (!chain) return [];

    return chain.challenges
      .map(id => this.challenges.get(id))
      .filter((challenge): challenge is Challenge => challenge !== undefined);
  }

  /**
   * Get chain progress
   */
  getChainProgress(chainId: string): number {
    const chain = this.challengeChains.get(chainId);
    if (!chain) return 0;

    return chain.currentPosition;
  }

  /**
   * Check if a chain is completed
   */
  isChainCompleted(chainId: string): boolean {
    const chain = this.challengeChains.get(chainId);
    return chain ? chain.completed : false;
  }

  /**
   * Get active chains
   */
  getActiveChains(): ChallengeChain[] {
    return Array.from(this.activeChains).map(id => 
      this.challengeChains.get(id)!
    ).filter(chain => chain !== undefined);
  }

  private initializeChainAchievements(): void {
    const achievements: ChainAchievement[] = [
      {
        id: 'combo_chain_master',
        name: 'Combo Chain Master',
        description: 'Complete the Combo Mastery chain',
        icon: '⚡',
        requirement: {
          type: 'chain_completion',
          chainId: 'combo_mastery',
          count: 1
        },
        reward: {
          type: 'permanent',
          effect: {
            type: 'combo',
            multiplier: 1.25
          }
        },
        progress: 0,
        completed: false
      },
      {
        id: 'brittle_chain_master',
        name: 'Brittle Chain Master',
        description: 'Complete the Brittle Mastery chain',
        icon: '💥',
        requirement: {
          type: 'chain_completion',
          chainId: 'brittle_mastery',
          count: 1
        },
        reward: {
          type: 'permanent',
          effect: {
            type: 'damage',
            multiplier: 1.25
          }
        },
        progress: 0,
        completed: false
      },
      {
        id: 'explosion_chain_master',
        name: 'Explosion Chain Master',
        description: 'Complete the Explosion Mastery chain',
        icon: '💫',
        requirement: {
          type: 'chain_completion',
          chainId: 'explosion_mastery',
          count: 1
        },
        reward: {
          type: 'permanent',
          effect: {
            type: 'range',
            multiplier: 1.25
          }
        },
        progress: 0,
        completed: false
      },
      {
        id: 'chain_grandmaster',
        name: 'Chain Grandmaster',
        description: 'Complete all challenge chains',
        icon: '👑',
        requirement: {
          type: 'chain_mastery',
          count: 3  // Number of total chains
        },
        reward: {
          type: 'permanent',
          effect: {
            type: 'combo',
            multiplier: 1.5
          }
        },
        progress: 0,
        completed: false
      }
    ];

    achievements.forEach(achievement => {
      this.chainAchievements.set(achievement.id, achievement);
    });
  }

  private checkChainAchievements(completedChainId: string): void {
    this.chainAchievements.forEach(achievement => {
      if (achievement.completed) return;

      if (achievement.requirement.type === 'chain_completion') {
        // Check specific chain completion
        if (achievement.requirement.chainId === completedChainId) {
          achievement.progress = 1;
          if (achievement.progress >= achievement.requirement.count) {
            this.unlockChainAchievement(achievement);
          }
        }
      } else if (achievement.requirement.type === 'chain_mastery') {
        // Check total completed chains
        achievement.progress = Array.from(this.challengeChains.values())
          .filter(chain => chain.completed).length;
        
        if (achievement.progress >= achievement.requirement.count) {
          this.unlockChainAchievement(achievement);
        }
      }
    });
  }

  private unlockChainAchievement(achievement: ChainAchievement): void {
    if (!this.scene || achievement.completed) return;

    achievement.completed = true;
    achievement.timeUnlocked = this.scene.time.now;
    this.unlockedChainAchievements.add(achievement.id);

    // Apply permanent reward
    if (achievement.reward.type === 'permanent') {
      this.applyPermanentChainReward(achievement.reward.effect);
    }

    // Announce achievement
    this.announceChainAchievement(achievement);

    this.checkMilestones();  // Check milestones after achievement unlock
  }

  private applyPermanentChainReward(effect: { type: string; multiplier: number }): void {
    switch (effect.type) {
      case 'damage':
        this.combatSystem.addPermanentDamageBonus(effect.multiplier);
        break;
      case 'range':
        this.combatSystem.addPermanentRangeBonus(effect.multiplier);
        break;
      case 'speed':
        this.combatSystem.addPermanentSpeedBonus(effect.multiplier);
        break;
      case 'resources':
        this.combatSystem.addPermanentResourceBonus(effect.multiplier);
        break;
      case 'combo':
        this.combatSystem.addPermanentComboBonus(effect.multiplier);
        break;
    }
  }

  private announceChainAchievement(achievement: ChainAchievement): void {
    if (!this.scene) return;

    const centerX = this.scene.cameras.main.width / 2;
    const centerY = this.scene.cameras.main.height / 2;

    // Create celebration particles
    const particles = this.scene.add.particles(0, 0, 'particle', {
      speed: { min: 100, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      blendMode: 'ADD',
      lifespan: 1500,
      gravityY: 50,
      tint: [0xffd700, 0xff4500, 0x00ff00]
    });

    particles.setPosition(centerX, centerY);
    particles.explode(100);

    // Create announcement text
    const title = this.scene.add.text(centerX, centerY - 60,
      `${achievement.icon} Chain Achievement Unlocked! ${achievement.icon}`,
      { fontSize: '32px', color: '#ffd700', fontStyle: 'bold' }
    ).setOrigin(0.5);

    const name = this.scene.add.text(centerX, centerY - 10,
      achievement.name,
      { fontSize: '28px', color: '#ffffff' }
    ).setOrigin(0.5);

    const description = this.scene.add.text(centerX, centerY + 30,
      achievement.description,
      { fontSize: '20px', color: '#aaaaaa' }
    ).setOrigin(0.5);

    const reward = this.scene.add.text(centerX, centerY + 70,
      `Permanent Reward: ${this.getChainRewardText(achievement.reward.effect)}`,
      { fontSize: '24px', color: '#2ecc71' }
    ).setOrigin(0.5);

    // Animate announcement
    const elements = [title, name, description, reward];
    elements.forEach(element => {
      element.setAlpha(0);
      this.scene?.tweens.add({
        targets: element,
        alpha: 1,
        y: element.y - 20,
        duration: 1000,
        ease: 'Back.out'
      });
    });

    // Cleanup after delay
    this.scene.time.delayedCall(5000, () => {
      elements.forEach(element => {
        this.scene?.tweens.add({
          targets: element,
          alpha: 0,
          y: element.y - 20,
          duration: 1000,
          onComplete: () => element.destroy()
        });
      });
      particles.destroy();
    });
  }

  private getChainRewardText(effect: { type: string; multiplier: number }): string {
    const percentage = Math.round((effect.multiplier - 1) * 100);
    switch (effect.type) {
      case 'damage':
        return `+${percentage}% Permanent Damage`;
      case 'range':
        return `+${percentage}% Permanent Range`;
      case 'speed':
        return `+${percentage}% Permanent Speed`;
      case 'resources':
        return `+${percentage}% Permanent Resources`;
      case 'combo':
        return `+${percentage}% Permanent Combo Effects`;
      default:
        return `+${percentage}% Permanent Bonus`;
    }
  }

  /**
   * Get all chain achievements
   */
  public getChainAchievements(): ChainAchievement[] {
    return Array.from(this.chainAchievements.values());
  }

  /**
   * Get unlocked chain achievements
   */
  public getUnlockedChainAchievements(): ChainAchievement[] {
    return Array.from(this.unlockedChainAchievements)
      .map(id => this.chainAchievements.get(id))
      .filter((achievement): achievement is ChainAchievement => achievement !== undefined);
  }

  private initializeMilestones(): void {
    const milestones: Milestone[] = [
      {
        id: 'chain_initiate',
        name: 'Chain Initiate',
        description: 'Complete your first chain',
        icon: '🌟',
        requirement: {
          type: 'chains',
          threshold: 1
        },
        reward: {
          type: 'multiplier',
          effect: {
            type: 'all_stats',
            value: 1.1  // 10% boost to all stats
          }
        },
        completed: false
      },
      {
        id: 'chain_adept',
        name: 'Chain Adept',
        description: 'Complete all normal difficulty chain challenges',
        icon: '⭐',
        requirement: {
          type: 'chains',
          threshold: 3
        },
        reward: {
          type: 'multiplier',
          effect: {
            type: 'chain_bonus',
            value: 1.25  // 25% increased chain bonus effects
          }
        },
        completed: false
      },
      {
        id: 'achievement_collector',
        name: 'Achievement Collector',
        description: 'Unlock 5 chain achievements',
        icon: '🏅',
        requirement: {
          type: 'achievements',
          threshold: 5
        },
        reward: {
          type: 'unlock',
          effect: {
            type: 'special_chain',
            value: 'mastery_chain'  // Unlocks a special mastery chain
          }
        },
        completed: false
      },
      {
        id: 'points_master',
        name: 'Points Master',
        description: 'Earn 1000 achievement points',
        icon: '👑',
        requirement: {
          type: 'points',
          threshold: 1000
        },
        reward: {
          type: 'multiplier',
          effect: {
            type: 'all_stats',
            value: 1.5  // 50% boost to all stats
          }
        },
        completed: false
      }
    ];

    milestones.forEach(milestone => {
      this.milestones.set(milestone.id, milestone);
    });
  }

  private checkMilestones(): void {
    this.milestones.forEach(milestone => {
      if (milestone.completed) return;

      let progress = 0;
      switch (milestone.requirement.type) {
        case 'chains':
          progress = Array.from(this.challengeChains.values())
            .filter(chain => chain.completed).length;
          break;
        case 'achievements':
          progress = this.unlockedChainAchievements.size;
          break;
        case 'points':
          progress = this.calculateTotalPoints();
          break;
      }

      if (progress >= milestone.requirement.threshold) {
        this.unlockMilestone(milestone);
      }
    });
  }

  public calculateTotalPoints(): number {
    return Array.from(this.unlockedChainAchievements)
      .map(id => this.chainAchievements.get(id))
      .filter((achievement): achievement is ChainAchievement => achievement !== undefined)
      .reduce((total, achievement) => {
        const basePoints = 50;
        const bonusPoints = Math.round((achievement.reward.effect.multiplier - 1) * 100);
        return total + basePoints + bonusPoints;
      }, 0);
  }

  private unlockMilestone(milestone: Milestone): void {
    if (!this.scene || milestone.completed) return;

    milestone.completed = true;
    milestone.timeUnlocked = this.scene.time.now;
    this.unlockedMilestones.add(milestone.id);

    // Apply milestone reward
    this.applyMilestoneReward(milestone);

    // Announce milestone
    this.announceMilestone(milestone);
  }

  private applyMilestoneReward(milestone: Milestone): void {
    if (milestone.reward.type === 'multiplier') {
      const multiplier = Number(milestone.reward.effect.value);
      switch (milestone.reward.effect.type) {
        case 'all_stats':
          this.combatSystem.addPermanentDamageBonus(multiplier);
          this.combatSystem.addPermanentRangeBonus(multiplier);
          this.combatSystem.addPermanentSpeedBonus(multiplier);
          this.combatSystem.addPermanentResourceBonus(multiplier);
          this.combatSystem.addPermanentComboBonus(multiplier);
          break;
        case 'chain_bonus':
          this.setChainBonusMultiplier(this.getChainBonusMultiplier() * multiplier);
          break;
      }
    } else if (milestone.reward.type === 'unlock') {
      this.handleSpecialUnlock(milestone.reward.effect.value as string);
    }
  }

  private handleSpecialUnlock(unlockId: string): void {
    // Implementation for special unlocks
    switch (unlockId) {
      case 'mastery_chain':
        // Add special mastery chain implementation
        break;
    }
  }

  private announceMilestone(milestone: Milestone): void {
    if (!this.scene) return;

    const centerX = this.scene.cameras.main.width / 2;
    const centerY = this.scene.cameras.main.height / 2;

    // Create celebration particles with special effects
    const particles = this.scene.add.particles(0, 0, 'particle', {
      speed: { min: 100, max: 300 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.8, end: 0 },
      blendMode: 'ADD',
      lifespan: 2000,
      gravityY: 50,
      tint: [0xffd700, 0xff4500, 0x00ff00, 0x4169e1],
      quantity: 2,
      frequency: 50,
      duration: 2000
    });

    particles.setPosition(centerX, centerY);

    // Create announcement text with special styling
    const title = this.scene.add.text(centerX, centerY - 80,
      `${milestone.icon} Milestone Achieved! ${milestone.icon}`,
      { 
        fontSize: '36px',
        color: '#ffd700',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
        shadow: { blur: 10, color: '#ff4500', fill: true }
      }
    ).setOrigin(0.5);

    const name = this.scene.add.text(centerX, centerY - 20,
      milestone.name,
      { fontSize: '32px', color: '#ffffff', fontStyle: 'bold' }
    ).setOrigin(0.5);

    const description = this.scene.add.text(centerX, centerY + 20,
      milestone.description,
      { fontSize: '24px', color: '#aaaaaa' }
    ).setOrigin(0.5);

    const rewardText = this.scene.add.text(centerX, centerY + 60,
      this.getMilestoneRewardText(milestone),
      { fontSize: '28px', color: '#2ecc71', fontStyle: 'bold' }
    ).setOrigin(0.5);

    // Add special animation effects
    const elements = [title, name, description, rewardText];
    elements.forEach((element, index) => {
      element.setAlpha(0);
      this.scene?.tweens.add({
        targets: element,
        alpha: 1,
        y: element.y - 30,
        duration: 1000,
        ease: 'Back.out',
        delay: index * 200
      });
    });

    // Add floating achievement points
    if (milestone.requirement.type === 'points') {
      this.createFloatingPoints(centerX, centerY);
    }

    // Cleanup after extended display time
    this.scene.time.delayedCall(6000, () => {
      elements.forEach(element => {
        this.scene?.tweens.add({
          targets: element,
          alpha: 0,
          y: element.y - 50,
          duration: 1000,
          onComplete: () => element.destroy()
        });
      });
      particles.destroy();
    });
  }

  private createFloatingPoints(x: number, y: number): void {
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const text = this.scene!.add.text(x, y, '+50',
        { fontSize: '24px', color: '#ffd700' }
      ).setOrigin(0.5);

      this.scene!.tweens.add({
        targets: text,
        x: x + Math.cos(angle) * 100,
        y: y + Math.sin(angle) * 100,
        alpha: 0,
        duration: 2000,
        ease: 'Quad.out',
        onComplete: () => text.destroy()
      });
    }
  }

  private getMilestoneRewardText(milestone: Milestone): string {
    if (milestone.reward.type === 'multiplier') {
      const percentage = Math.round((Number(milestone.reward.effect.value) - 1) * 100);
      switch (milestone.reward.effect.type) {
        case 'all_stats':
          return `Permanent +${percentage}% to All Stats!`;
        case 'chain_bonus':
          return `Chain Bonuses Increased by ${percentage}%!`;
        default:
          return `+${percentage}% Bonus!`;
      }
    } else {
      return 'Special Content Unlocked!';
    }
  }

  /**
   * Get all milestones
   */
  public getMilestones(): Milestone[] {
    return Array.from(this.milestones.values());
  }

  /**
   * Get unlocked milestones
   */
  public getUnlockedMilestones(): Milestone[] {
    return Array.from(this.unlockedMilestones)
      .map(id => this.milestones.get(id))
      .filter((milestone): milestone is Milestone => milestone !== undefined);
  }

  private expireReward(challenge: Challenge): void {
    if (!challenge.reward) return;

    // Reset the effect based on type
    switch (challenge.reward.type) {
      case 'damage':
      case 'combo':
        this.combatSystem.setGlobalEffectMultiplier(1.0);
        break;
      case 'range':
        this.combatSystem.setStatusSpreadRadius(0);
        break;
      case 'speed':
        this.combatSystem.setComboDurationMultiplier(1.0);
        break;
      case 'resources':
        // Resource multiplier would be handled by a different system
        break;
    }

    // Remove from active rewards
    this.activeRewards.delete(challenge.id);
  }

  private updateChallengeChain(chain: ChallengeChain): void {
    // Update chain progress
    let completed = true;
    let position = 1;
    
    for (const challengeId of chain.challenges) {
      const challenge = this.challenges.get(challengeId);
      if (!challenge || !challenge.completed) {
        completed = false;
        break;
      }
      position++;
    }
    
    chain.completed = completed;
    chain.currentPosition = position - 1;
    this.chainProgress.set(chain.id, position - 1);
  }

  private getChainBonusMultiplier(): number {
    return this.#chainBonusMultiplier;
  }

  private setChainBonusMultiplier(value: number): void {
    this.#chainBonusMultiplier = value;
  }

  private getChainBonusDuration(): number {
    return this.#chainBonusDuration;
  }

  // Add type guard for chain bonus
  private hasChainBonus(challenge: Challenge): challenge is Challenge & { chainBonus: NonNullable<Challenge['chainBonus']> } {
    return challenge.chainBonus !== undefined;
  }
} 