interface StoredAchievement {
  id: string;
  progress: number;
  achieved: boolean;
  lastUpdated: number;
}

export class AchievementStorage {
  private static readonly STORAGE_KEY = 'basecamp_achievements';
  private static instance: AchievementStorage;

  private constructor() {}

  static getInstance(): AchievementStorage {
    if (!AchievementStorage.instance) {
      AchievementStorage.instance = new AchievementStorage();
    }
    return AchievementStorage.instance;
  }

  saveAchievements(achievements: Array<{
    id: string;
    progress: number;
    achieved: boolean;
  }>): void {
    try {
      const storedData: StoredAchievement[] = achievements.map(achievement => ({
        id: achievement.id,
        progress: achievement.progress,
        achieved: achievement.achieved,
        lastUpdated: Date.now()
      }));

      localStorage.setItem(
        AchievementStorage.STORAGE_KEY,
        JSON.stringify(storedData)
      );
    } catch (error) {
      console.warn('Failed to save achievements:', error);
    }
  }

  loadAchievements(): StoredAchievement[] {
    try {
      const storedData = localStorage.getItem(AchievementStorage.STORAGE_KEY);
      if (!storedData) return [];

      const achievements: StoredAchievement[] = JSON.parse(storedData);
      return achievements;
    } catch (error) {
      console.warn('Failed to load achievements:', error);
      return [];
    }
  }

  clearAchievements(): void {
    try {
      localStorage.removeItem(AchievementStorage.STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear achievements:', error);
    }
  }

  updateAchievement(id: string, progress: number, achieved: boolean): void {
    try {
      const achievements = this.loadAchievements();
      const existingIndex = achievements.findIndex(a => a.id === id);

      const updatedAchievement: StoredAchievement = {
        id,
        progress,
        achieved,
        lastUpdated: Date.now()
      };

      if (existingIndex >= 0) {
        achievements[existingIndex] = updatedAchievement;
      } else {
        achievements.push(updatedAchievement);
      }

      localStorage.setItem(
        AchievementStorage.STORAGE_KEY,
        JSON.stringify(achievements)
      );
    } catch (error) {
      console.warn('Failed to update achievement:', error);
    }
  }

  getAchievement(id: string): StoredAchievement | undefined {
    try {
      const achievements = this.loadAchievements();
      return achievements.find(a => a.id === id);
    } catch (error) {
      console.warn('Failed to get achievement:', error);
      return undefined;
    }
  }
} 