import { Scene } from 'phaser';
import { AchievementStats } from '../systems/AchievementStats';
import { CombatSystem } from '../systems/CombatSystem';

/**
 * Panel that displays detailed achievement statistics
 */
export class AchievementStatsPanel {
  private scene: Scene;
  private panel: Phaser.GameObjects.Container;
  private isVisible: boolean = false;
  private achievementStats: AchievementStats;
  private combatSystem: CombatSystem;
  
  constructor(scene: Scene) {
    this.scene = scene;
    this.achievementStats = AchievementStats.getInstance();
    this.combatSystem = CombatSystem.getInstance();
    
    // Create the panel
    this.panel = this.createPanel();
    this.panel.setVisible(false);
    
    // Setup toggle button
    this.setupToggleButton();
  }
  
  /**
   * Creates the stats panel
   */
  private createPanel(): Phaser.GameObjects.Container {
    const panel = this.scene.add.container(0, 0);
    
    // Background
    const background = this.scene.add.rectangle(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2,
      600, 500, 0x000000, 0.9
    );
    background.setStrokeStyle(2, 0xffffff);
    
    // Title
    const title = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2 - 230,
      'Achievement Statistics',
      { fontSize: '28px', color: '#ffffff', fontStyle: 'bold' }
    ).setOrigin(0.5);
    
    // Close button
    const closeButton = this.scene.add.text(
      this.scene.cameras.main.width / 2 + 280,
      this.scene.cameras.main.height / 2 - 230,
      'X',
      { fontSize: '24px', color: '#ffffff' }
    ).setOrigin(0.5);
    
    closeButton.setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.toggleVisibility());
    
    // Add elements to panel
    panel.add([background, title, closeButton]);
    
    // Add stats sections
    this.addGeneralStats(panel);
    this.addTierProgress(panel);
    this.addComboStats(panel);
    this.addMilestones(panel);
    this.addRecentAchievements(panel);
    
    // Add reset button
    const resetButton = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2 + 220,
      'Reset Statistics',
      { fontSize: '18px', color: '#ff0000' }
    ).setOrigin(0.5);
    
    resetButton.setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.resetStats());
    
    panel.add(resetButton);
    
    return panel;
  }
  
  /**
   * Adds general achievement statistics
   */
  private addGeneralStats(panel: Phaser.GameObjects.Container): void {
    const stats = this.achievementStats.getStats();
    const totalAchievements = this.combatSystem.getAchievements().length;
    const completionPercentage = this.achievementStats.getCompletionPercentage(totalAchievements);
    
    // Section title
    const sectionTitle = this.scene.add.text(
      this.scene.cameras.main.width / 2 - 270,
      this.scene.cameras.main.height / 2 - 180,
      'General Statistics',
      { fontSize: '20px', color: '#ffd700', fontStyle: 'bold' }
    );
    
    // Stats text
    const statsText = this.scene.add.text(
      this.scene.cameras.main.width / 2 - 270,
      this.scene.cameras.main.height / 2 - 150,
      [
        `Total Unlocked: ${stats.totalUnlocked}/${totalAchievements} (${completionPercentage}%)`,
        `Bronze Unlocked: ${stats.bronzeUnlocked}`,
        `Silver Unlocked: ${stats.silverUnlocked}`,
        `Gold Unlocked: ${stats.goldUnlocked}`,
        `Last Unlocked: ${stats.lastUnlocked || 'None'}`,
        `Fastest Unlock: ${stats.fastestUnlock ? `${stats.fastestUnlock.id} (${Math.round(stats.fastestUnlock.timeMs / 1000)}s)` : 'None'}`,
        `Most Difficult: ${stats.mostDifficult ? `${stats.mostDifficult.id} (${stats.mostDifficult.attempts} attempts)` : 'None'}`
      ].join('\n'),
      { fontSize: '16px', color: '#ffffff', lineSpacing: 8 }
    );
    
    panel.add([sectionTitle, statsText]);
  }
  
  /**
   * Adds tier progress bars
   */
  private addTierProgress(panel: Phaser.GameObjects.Container): void {
    const tierPercentages = this.achievementStats.getTierPercentages();
    
    // Section title
    const sectionTitle = this.scene.add.text(
      this.scene.cameras.main.width / 2 + 20,
      this.scene.cameras.main.height / 2 - 180,
      'Tier Progress',
      { fontSize: '20px', color: '#ffd700', fontStyle: 'bold' }
    );
    
    // Bronze progress
    const bronzeLabel = this.scene.add.text(
      this.scene.cameras.main.width / 2 + 20,
      this.scene.cameras.main.height / 2 - 150,
      'Bronze:',
      { fontSize: '16px', color: '#cd7f32' }
    );
    
    const bronzeBarBg = this.scene.add.rectangle(
      this.scene.cameras.main.width / 2 + 120,
      this.scene.cameras.main.height / 2 - 145,
      200, 15, 0x333333
    );
    
    const bronzeBar = this.scene.add.rectangle(
      this.scene.cameras.main.width / 2 + 20 + (tierPercentages.bronze * 2) / 2,
      this.scene.cameras.main.height / 2 - 145,
      tierPercentages.bronze * 2, 15, 0xcd7f32
    );
    bronzeBar.setOrigin(0, 0.5);
    
    const bronzePercent = this.scene.add.text(
      this.scene.cameras.main.width / 2 + 230,
      this.scene.cameras.main.height / 2 - 145,
      `${tierPercentages.bronze}%`,
      { fontSize: '14px', color: '#ffffff' }
    ).setOrigin(0, 0.5);
    
    // Silver progress
    const silverLabel = this.scene.add.text(
      this.scene.cameras.main.width / 2 + 20,
      this.scene.cameras.main.height / 2 - 120,
      'Silver:',
      { fontSize: '16px', color: '#c0c0c0' }
    );
    
    const silverBarBg = this.scene.add.rectangle(
      this.scene.cameras.main.width / 2 + 120,
      this.scene.cameras.main.height / 2 - 115,
      200, 15, 0x333333
    );
    
    const silverBar = this.scene.add.rectangle(
      this.scene.cameras.main.width / 2 + 20 + (tierPercentages.silver * 2) / 2,
      this.scene.cameras.main.height / 2 - 115,
      tierPercentages.silver * 2, 15, 0xc0c0c0
    );
    silverBar.setOrigin(0, 0.5);
    
    const silverPercent = this.scene.add.text(
      this.scene.cameras.main.width / 2 + 230,
      this.scene.cameras.main.height / 2 - 115,
      `${tierPercentages.silver}%`,
      { fontSize: '14px', color: '#ffffff' }
    ).setOrigin(0, 0.5);
    
    // Gold progress
    const goldLabel = this.scene.add.text(
      this.scene.cameras.main.width / 2 + 20,
      this.scene.cameras.main.height / 2 - 90,
      'Gold:',
      { fontSize: '16px', color: '#ffd700' }
    );
    
    const goldBarBg = this.scene.add.rectangle(
      this.scene.cameras.main.width / 2 + 120,
      this.scene.cameras.main.height / 2 - 85,
      200, 15, 0x333333
    );
    
    const goldBar = this.scene.add.rectangle(
      this.scene.cameras.main.width / 2 + 20 + (tierPercentages.gold * 2) / 2,
      this.scene.cameras.main.height / 2 - 85,
      tierPercentages.gold * 2, 15, 0xffd700
    );
    goldBar.setOrigin(0, 0.5);
    
    const goldPercent = this.scene.add.text(
      this.scene.cameras.main.width / 2 + 230,
      this.scene.cameras.main.height / 2 - 85,
      `${tierPercentages.gold}%`,
      { fontSize: '14px', color: '#ffffff' }
    ).setOrigin(0, 0.5);
    
    panel.add([
      sectionTitle, 
      bronzeLabel, bronzeBarBg, bronzeBar, bronzePercent,
      silverLabel, silverBarBg, silverBar, silverPercent,
      goldLabel, goldBarBg, goldBar, goldPercent
    ]);
  }
  
  /**
   * Adds combo statistics
   */
  private addComboStats(panel: Phaser.GameObjects.Container): void {
    const stats = this.achievementStats.getStats();
    
    // Section title
    const sectionTitle = this.scene.add.text(
      this.scene.cameras.main.width / 2 - 270,
      this.scene.cameras.main.height / 2 - 30,
      'Combo Statistics',
      { fontSize: '20px', color: '#ffd700', fontStyle: 'bold' }
    );
    
    // Stats text
    const statsText = this.scene.add.text(
      this.scene.cameras.main.width / 2 - 270,
      this.scene.cameras.main.height / 2,
      [
        `Total Combos Triggered: ${stats.comboStats.totalTriggered}`,
        `Most Used Combo: ${stats.comboStats.mostUsed || 'None'} (${stats.comboStats.mostUsedCount} times)`,
        `Unique Combos Used: ${stats.comboStats.uniqueCombosUsed}`,
        `Longest Combo Chain: ${stats.comboStats.longestChain}`,
        `Combos This Session: ${stats.sessionStats.comboTriggersThisSession}`
      ].join('\n'),
      { fontSize: '16px', color: '#ffffff', lineSpacing: 8 }
    );
    
    panel.add([sectionTitle, statsText]);
  }
  
  /**
   * Adds milestone achievements
   */
  private addMilestones(panel: Phaser.GameObjects.Container): void {
    const stats = this.achievementStats.getStats();
    
    // Section title
    const sectionTitle = this.scene.add.text(
      this.scene.cameras.main.width / 2 + 20,
      this.scene.cameras.main.height / 2 - 30,
      'Achievement Milestones',
      { fontSize: '20px', color: '#ffd700', fontStyle: 'bold' }
    );
    
    // Stats text
    const statsText = this.scene.add.text(
      this.scene.cameras.main.width / 2 + 20,
      this.scene.cameras.main.height / 2,
      [
        `First Achievement: ${stats.milestones.first || 'Not Unlocked'}`,
        `10th Achievement: ${stats.milestones.tenth || 'Not Unlocked'}`,
        `25th Achievement: ${stats.milestones.twentyFifth || 'Not Unlocked'}`,
        `50th Achievement: ${stats.milestones.fiftieth || 'Not Unlocked'}`
      ].join('\n'),
      { fontSize: '16px', color: '#ffffff', lineSpacing: 8 }
    );
    
    panel.add([sectionTitle, statsText]);
  }
  
  /**
   * Adds recent achievements
   */
  private addRecentAchievements(panel: Phaser.GameObjects.Container): void {
    const recentAchievements = this.achievementStats.getRecentAchievements(5);
    
    // Section title
    const sectionTitle = this.scene.add.text(
      this.scene.cameras.main.width / 2 - 270,
      this.scene.cameras.main.height / 2 + 100,
      'Recent Achievements',
      { fontSize: '20px', color: '#ffd700', fontStyle: 'bold' }
    );
    
    // Stats text
    let recentText = 'None';
    if (recentAchievements.length > 0) {
      recentText = recentAchievements.join('\n');
    }
    
    const statsText = this.scene.add.text(
      this.scene.cameras.main.width / 2 - 270,
      this.scene.cameras.main.height / 2 + 130,
      recentText,
      { fontSize: '16px', color: '#ffffff', lineSpacing: 8 }
    );
    
    panel.add([sectionTitle, statsText]);
  }
  
  /**
   * Sets up the toggle button
   */
  private setupToggleButton(): void {
    const button = this.scene.add.text(
      this.scene.cameras.main.width - 150,
      30,
      '📊 Stats',
      { fontSize: '18px', color: '#ffffff' }
    ).setOrigin(0.5);
    
    button.setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.toggleVisibility())
      .on('pointerover', () => button.setStyle({ color: '#ffd700' }))
      .on('pointerout', () => button.setStyle({ color: '#ffffff' }));
  }
  
  /**
   * Toggles the visibility of the stats panel
   */
  toggleVisibility(): void {
    this.isVisible = !this.isVisible;
    this.panel.setVisible(this.isVisible);
    
    // Update stats when showing panel
    if (this.isVisible) {
      this.updateStats();
    }
  }
  
  /**
   * Updates the statistics display
   */
  private updateStats(): void {
    // Remove old stats
    this.panel.removeAll();
    
    // Recreate panel with updated stats
    const newPanel = this.createPanel();
    this.panel.add(newPanel.list);
  }
  
  /**
   * Resets all statistics
   */
  private resetStats(): void {
    // Show confirmation dialog
    const confirmBg = this.scene.add.rectangle(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2,
      400, 200, 0x000000, 0.95
    );
    confirmBg.setStrokeStyle(2, 0xff0000);
    
    const confirmText = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2 - 40,
      'Are you sure you want to reset all achievement statistics?\nThis cannot be undone.',
      { fontSize: '18px', color: '#ffffff', align: 'center' }
    ).setOrigin(0.5);
    
    const yesButton = this.scene.add.text(
      this.scene.cameras.main.width / 2 - 60,
      this.scene.cameras.main.height / 2 + 30,
      'Yes, Reset',
      { fontSize: '18px', color: '#ff0000' }
    ).setOrigin(0.5);
    
    const noButton = this.scene.add.text(
      this.scene.cameras.main.width / 2 + 60,
      this.scene.cameras.main.height / 2 + 30,
      'Cancel',
      { fontSize: '18px', color: '#ffffff' }
    ).setOrigin(0.5);
    
    yesButton.setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        // Reset stats
        this.achievementStats.resetStats();
        
        // Update display
        this.updateStats();
        
        // Remove confirmation dialog
        confirmBg.destroy();
        confirmText.destroy();
        yesButton.destroy();
        noButton.destroy();
      });
    
    noButton.setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        // Remove confirmation dialog
        confirmBg.destroy();
        confirmText.destroy();
        yesButton.destroy();
        noButton.destroy();
      });
  }
  
  /**
   * Updates the panel
   */
  update(): void {
    // Nothing to update per frame
  }
  
  /**
   * Destroys the panel
   */
  destroy(): void {
    this.panel.destroy();
  }
} 