import Phaser from 'phaser';
import CombatSystem from '../systems/CombatSystem';
import { AchievementRewards, AchievementReward } from '../systems/AchievementRewards';
import { RewardCombinations } from '../systems/RewardCombinations';

interface Achievement {
  id: string;
  name: string;
  description: string;
  requirement: number;
  progress: number;
  achieved: boolean;
  icon: string;
  tier?: 'bronze' | 'silver' | 'gold';
  nextTier?: string;
}

export class AchievementPanel {
  private scene: Phaser.Scene;
  private panel: Phaser.GameObjects.Container;
  private isVisible: boolean = false;
  private combatSystem: CombatSystem;
  private achievementRewards: AchievementRewards;
  private rewardCombinations: RewardCombinations;
  private achievementRows: Map<string, Phaser.GameObjects.Container> = new Map();
  private rewardRows: Map<string, Phaser.GameObjects.Container> = new Map();
  private comboRows: Map<string, Phaser.GameObjects.Container> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.combatSystem = CombatSystem.getInstance();
    this.achievementRewards = AchievementRewards.getInstance();
    this.rewardCombinations = RewardCombinations.getInstance();
    this.panel = this.createPanel();
    this.setupToggleButton();
    this.updateAchievements();
    this.updateRewards();
    this.updateCombos();

    // Listen for achievement, reward, and combo updates
    this.scene.events.on('achievementUnlocked', this.updateAchievements, this);
    this.scene.events.on('rewardUnlocked', this.updateRewards, this);
    this.scene.events.on('rewardComboUnlocked', this.updateCombos, this);
  }

  private createPanel(): Phaser.GameObjects.Container {
    const panel = this.scene.add.container(this.scene.cameras.main.width - 350, 50);
    
    // Background
    const background = this.scene.add.rectangle(0, 0, 300, 600, 0x000000, 0.9);
    background.setStrokeStyle(2, 0xffd700);
    
    // Achievements Title
    const achievementsTitle = this.scene.add.text(0, -280, 'Achievements', {
      fontSize: '24px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Rewards Title
    const rewardsTitle = this.scene.add.text(0, 0, 'Rewards', {
      fontSize: '24px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Combinations Title
    const combosTitle = this.scene.add.text(0, 280, 'Combinations', {
      fontSize: '24px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Close button
    const closeButton = this.scene.add.text(130, -280, 'X', {
      fontSize: '20px',
      color: '#ffffff'
    })
      .setInteractive()
      .on('pointerdown', () => this.toggleVisibility())
      .on('pointerover', () => closeButton.setColor('#ff0000'))
      .on('pointerout', () => closeButton.setColor('#ffffff'));

    panel.add([background, achievementsTitle, rewardsTitle, combosTitle, closeButton]);
    panel.setDepth(1000);
    panel.setAlpha(0);
    panel.setVisible(false);

    return panel;
  }

  private setupToggleButton() {
    const toggleButton = this.scene.add.container(this.scene.cameras.main.width - 60, 50);
    
    const buttonBg = this.scene.add.circle(0, 0, 25, 0x000000, 0.8);
    buttonBg.setStrokeStyle(2, 0xffd700);
    
    const icon = this.scene.add.text(0, 0, '🏆', { fontSize: '24px' }).setOrigin(0.5);
    
    toggleButton
      .add([buttonBg, icon])
      .setDepth(1000)
      .setInteractive(new Phaser.Geom.Circle(0, 0, 25), Phaser.Geom.Circle.Contains)
      .on('pointerdown', () => this.toggleVisibility())
      .on('pointerover', () => buttonBg.setFillStyle(0x333333, 0.8))
      .on('pointerout', () => buttonBg.setFillStyle(0x000000, 0.8));
  }

  private updateAchievements() {
    // Clear existing achievement rows
    this.achievementRows.forEach(row => row.destroy());
    this.achievementRows.clear();

    const achievements = this.combatSystem.getAchievements();
    
    achievements.forEach((achievement, index) => {
      const yOffset = -180 + (index * 70);
      const row = this.createAchievementRow(achievement, yOffset);
      this.achievementRows.set(achievement.id, row);
      this.panel.add(row);
    });
  }

  private updateRewards() {
    // Clear existing reward rows
    this.rewardRows.forEach(row => row.destroy());
    this.rewardRows.clear();

    const rewards = this.achievementRewards.getAllRewards();
    
    rewards.forEach((reward, index) => {
      const yOffset = 100 + (index * 70);
      const row = this.createRewardRow(reward, yOffset);
      this.rewardRows.set(reward.id, row);
      this.panel.add(row);
    });
  }

  private updateCombos() {
    // Clear existing combo rows
    this.comboRows.forEach(row => row.destroy());
    this.comboRows.clear();

    const combos = this.rewardCombinations.getAllRewardCombos();
    
    combos.forEach((combo, index) => {
      const yOffset = 330 + (index * 70);
      const row = this.createComboRow(combo, yOffset);
      this.comboRows.set(combo.id, row);
      this.panel.add(row);
    });
  }

  private createRewardRow(reward: AchievementReward, yOffset: number): Phaser.GameObjects.Container {
    const row = this.scene.add.container(0, yOffset);

    // Icon
    const icon = this.scene.add.text(-120, 0, reward.icon, {
      fontSize: '32px'
    }).setOrigin(0.5);

    // Name and description
    const name = this.scene.add.text(-90, -15, reward.name, {
      fontSize: '16px',
      color: reward.isActive ? '#ffd700' : '#888888',
      fontStyle: reward.isActive ? 'bold' : 'normal'
    });

    const description = this.scene.add.text(-90, 5, reward.description, {
      fontSize: '12px',
      color: reward.isActive ? '#ffffff' : '#666666'
    });

    // Status indicator
    const status = this.scene.add.text(110, -5, reward.isActive ? 'ACTIVE' : 'LOCKED', {
      fontSize: '12px',
      color: reward.isActive ? '#00ff00' : '#ff0000'
    }).setOrigin(1, 0.5);

    row.add([icon, name, description, status]);

    // Add glow effect for active rewards
    if (reward.isActive) {
      const glow = this.scene.add.rectangle(-120, 0, 40, 40, 0xffd700, 0.2);
      glow.setBlendMode(Phaser.BlendModes.ADD);
      row.add(glow);
      
      this.scene.tweens.add({
        targets: glow,
        alpha: 0.4,
        duration: 1000,
        yoyo: true,
        repeat: -1
      });
    }

    return row;
  }

  private createAchievementRow(achievement: Achievement, yOffset: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, yOffset);
    
    // Background with tier-specific styling
    let bgColor = 0x333333;
    let borderColor = achievement.achieved ? 0x00ff00 : 0x666666;
    
    // Apply tier-specific colors
    if (achievement.tier) {
      if (achievement.tier === 'bronze') {
        borderColor = achievement.achieved ? 0xcd7f32 : 0x8B4513;
      } else if (achievement.tier === 'silver') {
        borderColor = achievement.achieved ? 0xc0c0c0 : 0x808080;
      } else if (achievement.tier === 'gold') {
        borderColor = achievement.achieved ? 0xffd700 : 0xDAA520;
      }
    }
    
    const background = this.scene.add.rectangle(0, 0, 380, 60, bgColor, 0.8);
    background.setStrokeStyle(2, borderColor);
    
    // Icon with tier badge if applicable
    const iconText = this.scene.add.text(-170, 0, achievement.icon, { 
      fontSize: '24px' 
    }).setOrigin(0.5);
    
    // Add tier badge
    if (achievement.tier) {
      let tierColor: number;
      let tierSymbol: string;
      
      switch (achievement.tier) {
        case 'bronze':
          tierColor = 0xcd7f32;
          tierSymbol = '🥉';
          break;
        case 'silver':
          tierColor = 0xc0c0c0;
          tierSymbol = '🥈';
          break;
        case 'gold':
          tierColor = 0xffd700;
          tierSymbol = '🥇';
          break;
      }
      
      const tierBadge = this.scene.add.text(-190, -15, tierSymbol, { 
        fontSize: '16px' 
      }).setOrigin(0.5);
      
      container.add(tierBadge);
    }
    
    // Name with tier-specific color
    let nameColor = '#ffffff';
    if (achievement.tier === 'bronze') nameColor = '#cd7f32';
    if (achievement.tier === 'silver') nameColor = '#c0c0c0';
    if (achievement.tier === 'gold') nameColor = '#ffd700';
    
    const nameText = this.scene.add.text(-140, -15, achievement.name, { 
      fontSize: '16px',
      color: nameColor,
      fontStyle: achievement.achieved ? 'bold' : 'normal'
    });
    
    // Description
    const descText = this.scene.add.text(-140, 5, achievement.description, { 
      fontSize: '12px',
      color: '#aaaaaa'
    });
    
    // Progress bar
    const progressBg = this.scene.add.rectangle(-140, 25, 200, 10, 0x222222);
    progressBg.setOrigin(0, 0.5);
    
    const progress = Math.min(achievement.progress / achievement.requirement, 1);
    
    // Progress bar color based on tier
    let progressColor = 0x00ff00;
    if (achievement.tier === 'bronze') progressColor = 0xcd7f32;
    if (achievement.tier === 'silver') progressColor = 0xc0c0c0;
    if (achievement.tier === 'gold') progressColor = 0xffd700;
    
    const progressBar = this.scene.add.rectangle(-140, 25, 200 * progress, 10, progressColor);
    progressBar.setOrigin(0, 0.5);
    
    // Progress text
    const progressText = this.scene.add.text(70, 25, 
      `${achievement.progress}/${achievement.requirement}`, { 
      fontSize: '12px',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    // Status indicator
    const statusText = this.scene.add.text(150, 0, 
      achievement.achieved ? 'COMPLETED' : 'IN PROGRESS', { 
      fontSize: '12px',
      color: achievement.achieved ? '#00ff00' : '#ffff00'
    }).setOrigin(0.5);
    
    // Add glow effect for achieved gold tier
    if (achievement.achieved && achievement.tier === 'gold') {
      const glow = this.scene.add.graphics();
      glow.fillStyle(0xffd700, 0.3);
      glow.fillCircle(0, 0, 190);
      container.add(glow);
      
      // Add pulsing animation
      this.scene.tweens.add({
        targets: glow,
        alpha: 0.1,
        duration: 1500,
        yoyo: true,
        repeat: -1
      });
    }
    
    // Add all elements to container
    container.add([background, iconText, nameText, descText, 
                  progressBg, progressBar, progressText, statusText]);
    
    return container;
  }

  private createComboRow(combo: any, yOffset: number): Phaser.GameObjects.Container {
    const row = this.scene.add.container(0, yOffset);
    const isActive = this.rewardCombinations.isComboActive(combo.id);

    // Icon
    const icon = this.scene.add.text(-120, 0, combo.icon, {
      fontSize: '32px'
    }).setOrigin(0.5);

    // Name and description
    const name = this.scene.add.text(-90, -15, combo.name, {
      fontSize: '16px',
      color: isActive ? '#ffd700' : '#888888',
      fontStyle: isActive ? 'bold' : 'normal'
    });

    const description = this.scene.add.text(-90, 5, combo.description, {
      fontSize: '12px',
      color: isActive ? '#ffffff' : '#666666',
      wordWrap: { width: 260 }
    });

    // Required rewards text
    const requiredText = this.scene.add.text(110, -5, 
      isActive ? 'ACTIVE' : `${this.getActiveRequiredCount(combo)}/${combo.requiredRewards.length}`, {
      fontSize: '12px',
      color: isActive ? '#00ff00' : '#ff0000'
    }).setOrigin(1, 0.5);

    row.add([icon, name, description, requiredText]);

    // Add glow effect for active combos
    if (isActive) {
      const glow = this.scene.add.rectangle(-120, 0, 40, 40, 0xffd700, 0.2);
      glow.setBlendMode(Phaser.BlendModes.ADD);
      row.add(glow);
      
      this.scene.tweens.add({
        targets: glow,
        alpha: 0.4,
        duration: 1000,
        yoyo: true,
        repeat: -1
      });
    }

    return row;
  }

  private getActiveRequiredCount(combo: any): number {
    return combo.requiredRewards.filter(
      (rewardId: string) => this.achievementRewards.isRewardActive(rewardId)
    ).length;
  }

  toggleVisibility() {
    this.isVisible = !this.isVisible;
    
    if (this.isVisible) {
      this.panel.setVisible(true);
      this.scene.tweens.add({
        targets: this.panel,
        alpha: 1,
        duration: 200,
        ease: 'Power2'
      });
    } else {
      this.scene.tweens.add({
        targets: this.panel,
        alpha: 0,
        duration: 200,
        ease: 'Power2',
        onComplete: () => this.panel.setVisible(false)
      });
    }
  }

  destroy() {
    this.scene.events.off('achievementUnlocked', this.updateAchievements, this);
    this.scene.events.off('rewardUnlocked', this.updateRewards, this);
    this.scene.events.off('rewardComboUnlocked', this.updateCombos, this);
    this.panel.destroy();
    this.achievementRows.forEach(row => row.destroy());
    this.rewardRows.forEach(row => row.destroy());
    this.comboRows.forEach(row => row.destroy());
  }
} 