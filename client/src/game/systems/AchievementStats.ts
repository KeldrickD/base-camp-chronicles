import { Scene } from 'phaser';

interface Achievement {
  id: string;
  name: string;
  description: string;
  requirement: number;
  progress: number;
  achieved: boolean;
  icon: string;
  tier?: 'bronze' | 'silver' | 'gold';
}

interface AchievementStatData {
  totalUnlocked: number;
  bronzeUnlocked: number;
  silverUnlocked: number;
  goldUnlocked: number;
  lastUnlocked?: string;
  fastestUnlock?: {
    id: string;
    timeMs: number;
  };
  mostDifficult?: {
    id: string;
    attempts: number;
  };
  comboStats: {
    totalTriggered: number;
    mostUsed: string;
    mostUsedCount: number;
    uniqueCombosUsed: number;
    longestChain: number;
  };
  sessionStats: {
    startTime: number;
    achievementsThisSession: string[];
    comboTriggersThisSession: number;
  };
  milestones: {
    first: string;
    tenth: string;
    twentyFifth: string;
    fiftieth: string;
  };
  tierProgress: {
    bronze: number;
    silver: number;
    gold: number;
  };
  achievementAttempts: Record<string, number>;
  unlockTimes: Record<string, number>;
}

/**
 * Tracks detailed statistics about achievements and player performance
 */
export class AchievementStats {
  private static instance: AchievementStats;
  private scene?: Scene;
  private stats: AchievementStatData;
  
  private constructor() {
    // Initialize stats with default values
    this.stats = {
      totalUnlocked: 0,
      bronzeUnlocked: 0,
      silverUnlocked: 0,
      goldUnlocked: 0,
      comboStats: {
        totalTriggered: 0,
        mostUsed: '',
        mostUsedCount: 0,
        uniqueCombosUsed: 0,
        longestChain: 0
      },
      sessionStats: {
        startTime: Date.now(),
        achievementsThisSession: [],
        comboTriggersThisSession: 0
      },
      milestones: {
        first: '',
        tenth: '',
        twentyFifth: '',
        fiftieth: ''
      },
      tierProgress: {
        bronze: 0,
        silver: 0,
        gold: 0
      },
      achievementAttempts: {},
      unlockTimes: {}
    };
    
    this.loadStats();
  }
  
  static getInstance(): AchievementStats {
    if (!AchievementStats.instance) {
      AchievementStats.instance = new AchievementStats();
    }
    return AchievementStats.instance;
  }
  
  setScene(scene: Scene): void {
    this.scene = scene;
  }
  
  /**
   * Track when an achievement is unlocked
   */
  trackAchievementUnlock(achievement: Achievement): void {
    // Update total count
    this.stats.totalUnlocked++;
    
    // Update tier counts
    if (achievement.tier === 'bronze') {
      this.stats.bronzeUnlocked++;
      this.stats.tierProgress.bronze = Math.min(100, this.stats.bronzeUnlocked * 10);
    } else if (achievement.tier === 'silver') {
      this.stats.silverUnlocked++;
      this.stats.tierProgress.silver = Math.min(100, this.stats.silverUnlocked * 10);
    } else if (achievement.tier === 'gold') {
      this.stats.goldUnlocked++;
      this.stats.tierProgress.gold = Math.min(100, this.stats.goldUnlocked * 10);
    }
    
    // Track last unlocked
    this.stats.lastUnlocked = achievement.id;
    
    // Track unlock time
    const unlockTime = Date.now();
    this.stats.unlockTimes[achievement.id] = unlockTime;
    
    // Check if this is the fastest unlock
    const attempts = this.stats.achievementAttempts[achievement.id] || 1;
    if (!this.stats.fastestUnlock || attempts < (this.stats.achievementAttempts[this.stats.fastestUnlock.id] || Infinity)) {
      this.stats.fastestUnlock = {
        id: achievement.id,
        timeMs: unlockTime - this.stats.sessionStats.startTime
      };
    }
    
    // Check if this is the most difficult (most attempts)
    if (!this.stats.mostDifficult || attempts > (this.stats.achievementAttempts[this.stats.mostDifficult.id] || 0)) {
      this.stats.mostDifficult = {
        id: achievement.id,
        attempts: attempts
      };
    }
    
    // Track session achievements
    this.stats.sessionStats.achievementsThisSession.push(achievement.id);
    
    // Track milestones
    if (this.stats.totalUnlocked === 1 && !this.stats.milestones.first) {
      this.stats.milestones.first = achievement.id;
    } else if (this.stats.totalUnlocked === 10 && !this.stats.milestones.tenth) {
      this.stats.milestones.tenth = achievement.id;
    } else if (this.stats.totalUnlocked === 25 && !this.stats.milestones.twentyFifth) {
      this.stats.milestones.twentyFifth = achievement.id;
    } else if (this.stats.totalUnlocked === 50 && !this.stats.milestones.fiftieth) {
      this.stats.milestones.fiftieth = achievement.id;
    }
    
    // Save stats
    this.saveStats();
  }
  
  /**
   * Track when an achievement is attempted
   */
  trackAchievementAttempt(achievementId: string): void {
    if (!this.stats.achievementAttempts[achievementId]) {
      this.stats.achievementAttempts[achievementId] = 0;
    }
    
    this.stats.achievementAttempts[achievementId]++;
    this.saveStats();
  }
  
  /**
   * Track when a combo is triggered
   */
  trackComboTriggered(comboType: string, chainLength: number): void {
    // Update total triggered
    this.stats.comboStats.totalTriggered++;
    this.stats.sessionStats.comboTriggersThisSession++;
    
    // Track most used combo
    const comboCount = this.getComboCount(comboType) + 1;
    this.setComboCount(comboType, comboCount);
    
    if (comboCount > this.stats.comboStats.mostUsedCount) {
      this.stats.comboStats.mostUsed = comboType;
      this.stats.comboStats.mostUsedCount = comboCount;
    }
    
    // Track unique combos
    const uniqueCombos = new Set(Object.keys(this.getComboCountMap()));
    this.stats.comboStats.uniqueCombosUsed = uniqueCombos.size;
    
    // Track longest chain
    if (chainLength > this.stats.comboStats.longestChain) {
      this.stats.comboStats.longestChain = chainLength;
    }
    
    this.saveStats();
  }
  
  /**
   * Get combo count for a specific combo type
   */
  private getComboCount(comboType: string): number {
    return this.getComboCountMap()[comboType] || 0;
  }
  
  /**
   * Set combo count for a specific combo type
   */
  private setComboCount(comboType: string, count: number): void {
    const countMap = this.getComboCountMap();
    countMap[comboType] = count;
    localStorage.setItem('comboCountMap', JSON.stringify(countMap));
  }
  
  /**
   * Get the combo count map from storage
   */
  private getComboCountMap(): Record<string, number> {
    const storedMap = localStorage.getItem('comboCountMap');
    return storedMap ? JSON.parse(storedMap) : {};
  }
  
  /**
   * Start a new session
   */
  startNewSession(): void {
    this.stats.sessionStats = {
      startTime: Date.now(),
      achievementsThisSession: [],
      comboTriggersThisSession: 0
    };
    
    this.saveStats();
  }
  
  /**
   * Get all achievement statistics
   */
  getStats(): AchievementStatData {
    return this.stats;
  }
  
  /**
   * Get achievement completion percentage
   */
  getCompletionPercentage(totalAchievements: number): number {
    return Math.round((this.stats.totalUnlocked / totalAchievements) * 100);
  }
  
  /**
   * Get tier completion percentages
   */
  getTierPercentages(): { bronze: number; silver: number; gold: number } {
    return this.stats.tierProgress;
  }
  
  /**
   * Get most recent achievements
   */
  getRecentAchievements(count: number): string[] {
    // Sort achievements by unlock time (most recent first)
    const sortedAchievements = Object.entries(this.stats.unlockTimes)
      .sort(([, timeA], [, timeB]) => timeB - timeA)
      .map(([id]) => id);
    
    return sortedAchievements.slice(0, count);
  }
  
  /**
   * Save stats to local storage
   */
  private saveStats(): void {
    localStorage.setItem('achievementStats', JSON.stringify(this.stats));
  }
  
  /**
   * Load stats from local storage
   */
  private loadStats(): void {
    const storedStats = localStorage.getItem('achievementStats');
    if (storedStats) {
      this.stats = JSON.parse(storedStats);
      
      // Ensure session stats are reset
      if (!this.stats.sessionStats) {
        this.stats.sessionStats = {
          startTime: Date.now(),
          achievementsThisSession: [],
          comboTriggersThisSession: 0
        };
      }
    }
  }
  
  /**
   * Reset all statistics
   */
  resetStats(): void {
    localStorage.removeItem('achievementStats');
    localStorage.removeItem('comboCountMap');
    
    this.stats = {
      totalUnlocked: 0,
      bronzeUnlocked: 0,
      silverUnlocked: 0,
      goldUnlocked: 0,
      comboStats: {
        totalTriggered: 0,
        mostUsed: '',
        mostUsedCount: 0,
        uniqueCombosUsed: 0,
        longestChain: 0
      },
      sessionStats: {
        startTime: Date.now(),
        achievementsThisSession: [],
        comboTriggersThisSession: 0
      },
      milestones: {
        first: '',
        tenth: '',
        twentyFifth: '',
        fiftieth: ''
      },
      tierProgress: {
        bronze: 0,
        silver: 0,
        gold: 0
      },
      achievementAttempts: {},
      unlockTimes: {}
    };
  }
  
  destroy(): void {
    this.scene = undefined;
  }
  
  /**
   * Get current session stats
   */
  public getCurrentSessionStats(): {
    achievementsThisSession: string[];
    comboTriggersThisSession: number;
    startTime: number;
  } {
    return { ...this.stats.sessionStats };
  }
} 