import { Scene, GameObjects } from 'phaser';
import { AchievementChallenges } from '../systems/AchievementChallenges';
import {
  Milestone,
  Chain,
  Challenge,
  ChainAchievement,
  ChainStats,
  MilestoneEffect,
  MilestoneReward
} from '../types/AchievementTypes';

/**
 * Panel that displays active challenges and rewards
 */
export class ChallengePanel {
  private scene: Scene;
  private panel: GameObjects.Container;
  private isVisible: boolean = false;
  private achievementChallenges: AchievementChallenges;
  private updateTimer?: Phaser.Time.TimerEvent;
  
  private readonly DIFFICULTY_COLORS = {
    normal: 0x3498db,   // Blue
    advanced: 0x9b59b6, // Purple
    expert: 0xe74c3c    // Red
  } as const;

  private readonly DIFFICULTY_ICONS = {
    normal: '🔷',
    advanced: '🔶',
    expert: '💠'
  } as const;
  
  constructor(scene: Scene) {
    this.scene = scene;
    this.achievementChallenges = AchievementChallenges.getInstance();
    
    // Create the panel
    this.panel = this.createPanel();
    this.panel.setVisible(false);
    
    // Setup toggle button
    this.setupToggleButton();
    
    // Set up update timer
    this.updateTimer = this.scene.time.addEvent({
      delay: 1000, // Update every second
      callback: this.updateChallenges.bind(this),
      loop: true
    });
  }
  
  /**
   * Creates the challenge panel
   */
  private createPanel(): Phaser.GameObjects.Container {
    const panel = this.scene.add.container(0, 0);
    
    // Background (increased height for milestone history)
    const background = this.scene.add.rectangle(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2,
      500, 900,  // Increased height for milestone history
      0x000000, 0.9
    );
    background.setStrokeStyle(2, 0x3498db);
    
    // Title
    const title = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2 - 430,  // Adjusted position
      'Achievement Challenges',
      { fontSize: '28px', color: '#ffffff', fontStyle: 'bold' }
    ).setOrigin(0.5);
    
    // Close button
    const closeButton = this.scene.add.text(
      this.scene.cameras.main.width / 2 + 230,
      this.scene.cameras.main.height / 2 - 430,  // Adjusted position
      'X',
      { fontSize: '24px', color: '#ffffff' }
    ).setOrigin(0.5);
    
    closeButton.setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.toggleVisibility());
    
    // Add elements to panel
    panel.add([background, title, closeButton]);
    
    // Add sections
    this.addMilestonesSection(panel);
    this.addMilestoneHistorySection(panel);  // New section
    this.addChainSection(panel);
    this.addChainAchievementsSection(panel);
    this.addActiveChallenges(panel);
    this.addActiveRewards(panel);
    this.addChainStatisticsSection(panel);
    
    return panel;
  }
  
  /**
   * Adds milestones section
   */
  private addMilestonesSection(panel: Phaser.GameObjects.Container): void {
    // Section title with special styling
    const sectionTitle = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2 - 330,
      '🏆 Achievement Milestones 🏆',
      { 
        fontSize: '24px',
        color: '#ffd700',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
        shadow: { blur: 5, color: '#ff4500', fill: true }
      }
    ).setOrigin(0.5);
    
    panel.add(sectionTitle);
    
    // Get milestones
    const milestones = this.achievementChallenges.getMilestones();
    const unlockedMilestones = this.achievementChallenges.getUnlockedMilestones();
    
    if (milestones.length === 0) {
      const noMilestones = this.scene.add.text(
        this.scene.cameras.main.width / 2,
        this.scene.cameras.main.height / 2 - 300,
        'No milestones available',
        { fontSize: '16px', color: '#aaaaaa' }
      ).setOrigin(0.5);
      
      panel.add(noMilestones);
    } else {
      // Create milestone rows
      milestones.forEach((milestone, index) => {
        const yOffset = this.scene.cameras.main.height / 2 - 300 + (index * 60);
        const milestoneRow = this.createMilestoneRow(
          milestone,
          yOffset,
          unlockedMilestones.some(m => m.id === milestone.id)
        );
        panel.add(milestoneRow);
      });
    }
  }

  /**
   * Creates a row for a milestone
   */
  private createMilestoneRow(milestone: Milestone, yOffset: number, isUnlocked: boolean): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, yOffset);
    
    // Background with special styling for milestones
    const background = this.scene.add.rectangle(
      this.scene.cameras.main.width / 2,
      0,
      450, 50,
      isUnlocked ? 0x2c3e50 : 0x333333,
      0.8
    );
    
    // Add glowing border for unlocked milestones
    if (isUnlocked) {
      background.setStrokeStyle(3, 0xffd700);
      this.scene.tweens.add({
        targets: background,
        alpha: { from: 0.8, to: 0.6 },
        duration: 2000,
        yoyo: true,
        repeat: -1
      });
    } else {
      background.setStrokeStyle(2, 0x666666);
    }
    
    // Milestone icon with special effects
    const icon = this.scene.add.text(
      this.scene.cameras.main.width / 2 - 210,
      0,
      milestone.icon,
      { fontSize: '28px' }
    ).setOrigin(0.5);
    
    if (isUnlocked) {
      this.scene.tweens.add({
        targets: icon,
        scale: { from: 1, to: 1.2 },
        duration: 1000,
        yoyo: true,
        repeat: -1
      });
    }
    
    // Name with special styling
    const name = this.scene.add.text(
      this.scene.cameras.main.width / 2 - 170,
      -10,
      milestone.name,
      { 
        fontSize: '18px',
        color: isUnlocked ? '#ffd700' : '#ffffff',
        fontStyle: 'bold',
        stroke: isUnlocked ? '#000000' : undefined,
        strokeThickness: isUnlocked ? 1 : 0
      }
    );
    
    // Description
    const description = this.scene.add.text(
      this.scene.cameras.main.width / 2 - 170,
      10,
      milestone.description,
      { fontSize: '12px', color: '#aaaaaa' }
    );
    
    // Progress or completion status
    let progress = 0;
    switch (milestone.requirement.type) {
      case 'chains':
        progress = this.achievementChallenges.getAllChains()
          .filter(chain => chain.completed).length;
        break;
      case 'achievements':
        progress = this.achievementChallenges.getUnlockedChainAchievements().length;
        break;
      case 'points':
        progress = this.achievementChallenges.calculateTotalPoints();
        break;
    }
    
    const statusText = isUnlocked ? 
      'COMPLETED!' : 
      `Progress: ${progress}/${milestone.requirement.threshold}`;
    
    const status = this.scene.add.text(
      this.scene.cameras.main.width / 2 + 180,
      -10,
      statusText,
      { 
        fontSize: '14px',
        color: isUnlocked ? '#2ecc71' : '#ffffff',
        fontStyle: isUnlocked ? 'bold' : 'normal'
      }
    ).setOrigin(1, 0);
    
    // Progress bar for incomplete milestones
    let progressBar;
    if (!isUnlocked) {
      const progressWidth = 100;
      const progressHeight = 6;
      
      // Background bar
      const progressBg = this.scene.add.rectangle(
        this.scene.cameras.main.width / 2 + 130,
        12,
        progressWidth,
        progressHeight,
        0x666666
      );
      
      // Progress fill
      const progressFill = this.scene.add.rectangle(
        this.scene.cameras.main.width / 2 + 80,
        12,
        progressWidth * Math.min(progress / milestone.requirement.threshold, 1),
        progressHeight,
        0x3498db
      );
      progressFill.setOrigin(0, 0.5);
      
      progressBar = this.scene.add.container(0, 0, [progressBg, progressFill]);
    }
    
    // Reward preview
    const rewardPreview = this.scene.add.text(
      this.scene.cameras.main.width / 2 + 180,
      10,
      this.getMilestoneRewardText(milestone),
      { 
        fontSize: '12px',
        color: isUnlocked ? '#2ecc71' : '#e67e22',
        fontStyle: 'italic'
      }
    ).setOrigin(1, 0);
    
    // Add elements to container
    const elements: (Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text | Phaser.GameObjects.Container)[] = [
      background, icon, name, description, status, rewardPreview
    ];
    if (progressBar) elements.push(progressBar);
    
    container.add(elements);
    
    return container;
  }

  /**
   * Gets the reward text for a milestone
   */
  private getMilestoneRewardText(milestone: Milestone): string {
    if (milestone.reward.type === 'multiplier' && typeof milestone.reward.effect.value === 'number') {
      const percentage = Math.round((milestone.reward.effect.value - 1) * 100);
      switch (milestone.reward.effect.type) {
        case 'all_stats':
          return `+${percentage}% All Stats`;
        case 'chain_bonus':
          return `+${percentage}% Chain Bonuses`;
        case 'special_chain':
          return `Special Chain Bonus`;
        default:
          return `+${percentage}% Bonus`;
      }
    }
    return 'Special Unlock';
  }
  
  /**
   * Adds milestone history section
   */
  private addMilestoneHistorySection(panel: Phaser.GameObjects.Container): void {
    // Section title with special styling
    const sectionTitle = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2 - 250,
      '📜 Milestone History 📜',
      { 
        fontSize: '24px',
        color: '#e67e22',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
        shadow: { blur: 5, color: '#ff4500', fill: true }
      }
    ).setOrigin(0.5);
    
    panel.add(sectionTitle);
    
    // Get unlocked milestones sorted by unlock time
    const unlockedMilestones = this.achievementChallenges.getUnlockedMilestones()
      .sort((a, b) => (b.timeUnlocked || 0) - (a.timeUnlocked || 0));
    
    if (unlockedMilestones.length === 0) {
      const noHistory = this.scene.add.text(
        this.scene.cameras.main.width / 2,
        this.scene.cameras.main.height / 2 - 220,
        'No milestones unlocked yet',
        { fontSize: '16px', color: '#aaaaaa' }
      ).setOrigin(0.5);
      
      panel.add(noHistory);
    } else {
      // Create scrollable history container
      const historyContainer = this.createScrollableHistory(unlockedMilestones);
      historyContainer.setPosition(
        this.scene.cameras.main.width / 2,
        this.scene.cameras.main.height / 2 - 220
      );
      
      panel.add(historyContainer);
    }
  }

  /**
   * Creates a scrollable history container
   */
  private createScrollableHistory(milestones: Milestone[]): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);
    const spacing = 70;  // Increased spacing for more detailed entries
    
    milestones.forEach((milestone, index) => {
      const entryContainer = this.createHistoryEntry(milestone, index * spacing);
      container.add(entryContainer);
    });
    
    // Add scroll functionality if needed
    if (milestones.length > 3) {
      this.addScrollBehavior(container, milestones.length * spacing);
    }
    
    return container;
  }

  /**
   * Creates a history entry for a milestone
   */
  private createHistoryEntry(milestone: Milestone, yOffset: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, yOffset);
    
    // Background with gradient effect
    const background = this.scene.add.rectangle(
      0, 0,
      450, 60,
      0x2c3e50, 0.8
    );
    background.setStrokeStyle(2, 0xf39c12);
    
    // Add shimmer effect
    this.scene.tweens.add({
      targets: background,
      alpha: { from: 0.8, to: 0.6 },
      duration: 2000,
      yoyo: true,
      repeat: -1
    });
    
    // Timestamp with fancy formatting
    const timestamp = this.formatTimestamp(milestone.timeUnlocked);
    const timeText = this.scene.add.text(
      -210, -25,
      timestamp,
      { 
        fontSize: '12px',
        color: '#f1c40f',
        fontStyle: 'italic'
      }
    );
    
    // Icon with glow effect
    const icon = this.scene.add.text(
      -210, 5,
      milestone.icon,
      { fontSize: '24px' }
    ).setOrigin(0.5);
    
    this.scene.tweens.add({
      targets: icon,
      scale: { from: 1, to: 1.2 },
      alpha: { from: 1, to: 0.8 },
      duration: 1500,
      yoyo: true,
      repeat: -1
    });
    
    // Name and description
    const name = this.scene.add.text(
      -170, -20,
      milestone.name,
      { 
        fontSize: '18px',
        color: '#f39c12',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 1
      }
    );
    
    const description = this.scene.add.text(
      -170, 5,
      milestone.description,
      { fontSize: '12px', color: '#bdc3c7' }
    );
    
    // Reward text with special formatting
    const rewardText = this.scene.add.text(
      180, -10,
      this.getMilestoneRewardText(milestone),
      { 
        fontSize: '14px',
        color: '#2ecc71',
        align: 'right',
        fontStyle: 'bold'
      }
    ).setOrigin(1, 0);
    
    // Stats impact (if applicable)
    const statsImpact = this.getStatsImpactText(milestone);
    if (statsImpact) {
      const impactText = this.scene.add.text(
        180, 10,
        statsImpact,
        { 
          fontSize: '12px',
          color: '#3498db',
          align: 'right',
          fontStyle: 'italic'
        }
      ).setOrigin(1, 0);
      container.add(impactText);
    }
    
    container.add([background, timeText, icon, name, description, rewardText]);
    
    return container;
  }

  /**
   * Formats a timestamp into a readable string
   */
  private formatTimestamp(timestamp?: number): string {
    if (!timestamp) return 'Unknown time';
    
    const now = Date.now();
    const diff = now - timestamp;
    
    // Convert to minutes, hours, or days
    if (diff < 60000) {  // Less than 1 minute
      return 'Just now';
    } else if (diff < 3600000) {  // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diff < 86400000) {  // Less than 1 day
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diff / 86400000);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  }

  /**
   * Gets the stats impact text for a milestone
   */
  private getStatsImpactText(milestone: Milestone): string {
    if (milestone.reward.type === 'multiplier' && typeof milestone.reward.effect.value === 'number') {
      const percentage = Math.round((milestone.reward.effect.value - 1) * 100);
      switch (milestone.reward.effect.type) {
        case 'all_stats':
          return `Permanent boost to all attributes (+${percentage}%)`;
        case 'chain_bonus':
          return `Enhanced chain completion rewards (+${percentage}%)`;
        default:
          return '';
      }
    } else if (milestone.reward.type === 'unlock') {
      return 'Unlocked new content';
    }
    return '';
  }

  /**
   * Adds scroll behavior to a container
   */
  private addScrollBehavior(container: Phaser.GameObjects.Container, contentHeight: number): void {
    const maxScroll = Math.max(0, contentHeight - 200);
    let isDragging = false;
    let startY = 0;
    let currentY = 0;
    
    // Add scroll indicators
    const upIndicator = this.scene.add.triangle(
      0, -120,
      0, 10,
      10, 0,
      -10, 0,
      0x3498db
    );
    
    const downIndicator = this.scene.add.triangle(
      0, 120,
      0, -10,
      10, 0,
      -10, 0,
      0x3498db
    );
    
    container.add([upIndicator, downIndicator]);
    
    // Update indicator visibility
    const updateIndicators = () => {
      upIndicator.setVisible(currentY < 0);
      downIndicator.setVisible(currentY > -maxScroll);
    };
    
    // Add interactive area
    const hitArea = this.scene.add.rectangle(
      0, 0,
      450, 200,
      0x000000, 0
    );
    hitArea.setInteractive();
    container.add(hitArea);
    
    // Setup drag events
    hitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      isDragging = true;
      startY = pointer.y - currentY;
    });
    
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!isDragging) return;
      
      currentY = Phaser.Math.Clamp(
        pointer.y - startY,
        -maxScroll,
        0
      );
      
      container.y = this.scene.cameras.main.height / 2 - 220 + currentY;
      updateIndicators();
    });
    
    this.scene.input.on('pointerup', () => {
      isDragging = false;
    });
    
    // Add mouse wheel support
    this.scene.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: GameObjects.GameObject[], deltaX: number, deltaY: number) => {
      if (!hitArea.getBounds().contains(pointer.x, pointer.y)) return;
      
      const scrollDelta = deltaY || 0;
      currentY = Phaser.Math.Clamp(
        currentY - scrollDelta,
        -maxScroll,
        0
      );
      
      container.y = this.scene.cameras.main.height / 2 - 220 + currentY;
      updateIndicators();
    });
    
    // Initialize indicators
    updateIndicators();
  }
  
  /**
   * Adds chain section
   */
  private addChainSection(panel: Phaser.GameObjects.Container): void {
    // Section title
    const sectionTitle = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2 - 180,
      'Challenge Chains',
      { fontSize: '20px', color: '#ffd700', fontStyle: 'bold' }
    ).setOrigin(0.5);
    
    panel.add(sectionTitle);
    
    // Get all challenge chains
    const chains = this.achievementChallenges.getAllChains();
    
    if (chains.length === 0) {
      const noChains = this.scene.add.text(
        this.scene.cameras.main.width / 2,
        this.scene.cameras.main.height / 2 - 150,
        'No challenge chains available',
        { fontSize: '16px', color: '#aaaaaa' }
      ).setOrigin(0.5);
      
      panel.add(noChains);
    } else {
      // Create chain rows
      chains.forEach((chain, index) => {
        const yOffset = this.scene.cameras.main.height / 2 - 150 + (index * 70);
        const chainRow = this.createChainRow(chain, yOffset);
        panel.add(chainRow);
      });
    }
  }
  
  /**
   * Creates a row for a chain
   */
  private createChainRow(chain: Chain, yOffset: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, yOffset);
    
    // Background
    const background = this.scene.add.rectangle(
      this.scene.cameras.main.width / 2,
      0,
      450, 60, 0x333333, 0.8
    );
    background.setStrokeStyle(2, chain.completed ? 0xffd700 : 0x666666);
    
    // Chain icon
    const icon = this.scene.add.text(
      this.scene.cameras.main.width / 2 - 210,
      -15,
      chain.icon,
      { fontSize: '24px' }
    ).setOrigin(0.5);
    
    // Chain name
    const name = this.scene.add.text(
      this.scene.cameras.main.width / 2 - 170,
      -15,
      chain.name,
      { 
        fontSize: '18px',
        color: chain.completed ? '#ffd700' : '#ffffff',
        fontStyle: 'bold'
      }
    );
    
    // Chain description
    const description = this.scene.add.text(
      this.scene.cameras.main.width / 2 - 170,
      10,
      chain.description,
      { fontSize: '12px', color: '#aaaaaa' }
    );
    
    // Progress indicators
    const progressContainer = this.createChainProgressIndicators(
      chain,
      this.scene.cameras.main.width / 2 + 100,
      0
    );
    
    // Add elements to container
    container.add([background, icon, name, description, progressContainer]);
    
    return container;
  }
  
  /**
   * Creates progress indicators for a chain
   */
  private createChainProgressIndicators(chain: Chain, x: number, y: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    
    // Get challenges in this chain
    const challenges = this.achievementChallenges.getChallengesInChain(chain.id);
    const spacing = 40;
    
    challenges.forEach((challenge, index) => {
      // Create circle background
      const circle = this.scene.add.circle(
        index * spacing,
        0,
        15,
        0x333333
      );
      
      // Add border based on status
      let borderColor = 0x666666; // Locked
      if (challenge.completed) {
        borderColor = 0x2ecc71; // Completed
      } else if (challenge.active) {
        borderColor = 0x3498db; // Active
      }
      circle.setStrokeStyle(2, borderColor);
      
      // Add difficulty indicator
      const difficultyIcon = this.scene.add.text(
        index * spacing,
        0,
        this.DIFFICULTY_ICONS[challenge.difficulty],
        { fontSize: '12px' }
      ).setOrigin(0.5);
      
      // Add glow effect for active challenge
      if (challenge.active) {
        this.scene.tweens.add({
          targets: circle,
          scaleX: 1.2,
          scaleY: 1.2,
          alpha: 0.8,
          duration: 1000,
          yoyo: true,
          repeat: -1
        });
      }
      
      container.add([circle, difficultyIcon]);
    });
    
    // Add connecting lines between circles
    for (let i = 0; i < challenges.length - 1; i++) {
      const line = this.scene.add.line(
        i * spacing + 15,
        0,
        0,
        0,
        spacing - 30,
        0,
        0x666666
      );
      line.setLineWidth(2);
      container.add(line);
      
      // Place line behind circles
      line.setDepth(-1);
    }
    
    return container;
  }
  
  /**
   * Adds chain achievements section
   */
  private addChainAchievementsSection(panel: Phaser.GameObjects.Container): void {
    // Section title
    const sectionTitle = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2 + 50,  // Positioned below chains
      'Chain Achievements',
      { fontSize: '20px', color: '#ffd700', fontStyle: 'bold' }
    ).setOrigin(0.5);
    
    panel.add(sectionTitle);
    
    // Get chain achievements
    const achievements = this.achievementChallenges.getChainAchievements();
    const unlockedAchievements = this.achievementChallenges.getUnlockedChainAchievements();
    
    if (achievements.length === 0) {
      const noAchievements = this.scene.add.text(
        this.scene.cameras.main.width / 2,
        this.scene.cameras.main.height / 2 + 80,
        'No chain achievements available',
        { fontSize: '16px', color: '#aaaaaa' }
      ).setOrigin(0.5);
      
      panel.add(noAchievements);
    } else {
      // Create achievement rows
      achievements.forEach((achievement, index) => {
        const yOffset = this.scene.cameras.main.height / 2 + 80 + (index * 60);
        const achievementRow = this.createChainAchievementRow(
          achievement,
          yOffset,
          unlockedAchievements.some(a => a.id === achievement.id)
        );
        panel.add(achievementRow);
      });
    }
  }

  /**
   * Creates a row for a chain achievement
   */
  private createChainAchievementRow(achievement: ChainAchievement, yOffset: number, isUnlocked: boolean): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, yOffset);
    
    // Background
    const background = this.scene.add.rectangle(
      this.scene.cameras.main.width / 2,
      0,
      450, 50,
      0x333333, 0.8
    );
    background.setStrokeStyle(2, isUnlocked ? 0xffd700 : 0x666666);
    
    // Achievement icon
    const icon = this.scene.add.text(
      this.scene.cameras.main.width / 2 - 210,
      0,
      achievement.icon,
      { fontSize: '24px' }
    ).setOrigin(0.5);
    
    // Name
    const name = this.scene.add.text(
      this.scene.cameras.main.width / 2 - 170,
      -10,
      achievement.name,
      { 
        fontSize: '16px',
        color: isUnlocked ? '#ffd700' : '#ffffff',
        fontStyle: 'bold'
      }
    );
    
    // Description
    const description = this.scene.add.text(
      this.scene.cameras.main.width / 2 - 170,
      10,
      achievement.description,
      { fontSize: '12px', color: '#aaaaaa' }
    );
    
    // Progress or completion status
    const statusText = isUnlocked ? 
      'UNLOCKED' : 
      `Progress: ${achievement.progress}/${achievement.requirement.count}`;
    
    const status = this.scene.add.text(
      this.scene.cameras.main.width / 2 + 180,
      -10,
      statusText,
      { 
        fontSize: '14px',
        color: isUnlocked ? '#2ecc71' : '#ffffff'
      }
    ).setOrigin(1, 0);
    
    // Reward text
    const rewardText = this.scene.add.text(
      this.scene.cameras.main.width / 2 + 180,
      10,
      this.getChainAchievementRewardText(achievement.reward.effect),
      { fontSize: '12px', color: '#2ecc71' }
    ).setOrigin(1, 0);
    
    // Add glow effect for unlocked achievements
    if (isUnlocked) {
      this.scene.tweens.add({
        targets: background,
        alpha: { from: 0.8, to: 0.6 },
        duration: 1500,
        yoyo: true,
        repeat: -1
      });
    }
    
    // Add elements to container
    container.add([background, icon, name, description, status, rewardText]);
    
    return container;
  }

  private getChainAchievementRewardText(effect: { type: string; multiplier: number }): string {
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
   * Adds active challenges section
   */
  private addActiveChallenges(panel: Phaser.GameObjects.Container): void {
    // Section title
    const sectionTitle = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2 - 130,
      'Active Challenges',
      { fontSize: '20px', color: '#3498db', fontStyle: 'bold' }
    ).setOrigin(0.5);
    
    panel.add(sectionTitle);
    
    // Get active challenges
    const activeChallenges = this.achievementChallenges.getActiveChallenges();
    
    if (activeChallenges.length === 0) {
      // No active challenges
      const noActiveChallenges = this.scene.add.text(
        this.scene.cameras.main.width / 2,
        this.scene.cameras.main.height / 2 - 100,
        'No active challenges',
        { fontSize: '16px', color: '#aaaaaa' }
      ).setOrigin(0.5);
      
      panel.add(noActiveChallenges);
    } else {
      // Create challenge rows
      activeChallenges.forEach((challenge, index) => {
        const yOffset = this.scene.cameras.main.height / 2 - 100 + (index * 60);
        const challengeRow = this.createChallengeRow(challenge, yOffset);
        panel.add(challengeRow);
      });
    }
  }
  
  /**
   * Adds active rewards section
   */
  private addActiveRewards(panel: Phaser.GameObjects.Container): void {
    // Section title
    const sectionTitle = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2 + 50,
      'Active Rewards',
      { fontSize: '20px', color: '#2ecc71', fontStyle: 'bold' }
    ).setOrigin(0.5);
    
    panel.add(sectionTitle);
    
    // Get active rewards
    const activeRewards = this.achievementChallenges.getActiveRewards();
    
    if (activeRewards.length === 0) {
      // No active rewards
      const noActiveRewards = this.scene.add.text(
        this.scene.cameras.main.width / 2,
        this.scene.cameras.main.height / 2 + 80,
        'No active rewards',
        { fontSize: '16px', color: '#aaaaaa' }
      ).setOrigin(0.5);
      
      panel.add(noActiveRewards);
    } else {
      // Create reward rows
      activeRewards.forEach((challenge, index) => {
        const yOffset = this.scene.cameras.main.height / 2 + 80 + (index * 60);
        const rewardRow = this.createRewardRow(challenge, yOffset);
        panel.add(rewardRow);
      });
    }
  }
  
  /**
   * Creates a row for a challenge
   */
  private createChallengeRow(challenge: Challenge, yOffset: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, yOffset);
    
    // Background with difficulty color
    const background = this.scene.add.rectangle(
      this.scene.cameras.main.width / 2,
      0,
      450, 50, 0x333333, 0.8
    );
    background.setStrokeStyle(2, this.DIFFICULTY_COLORS[challenge.difficulty]);
    
    // Chain indicator (if part of a chain)
    let chainIcon;
    if (challenge.chainId) {
      const chain = this.achievementChallenges.getChain(challenge.chainId);
      if (chain) {
        chainIcon = this.scene.add.text(
          this.scene.cameras.main.width / 2 - 220,
          0,
          chain.icon,
          { fontSize: '16px' }
        ).setOrigin(0.5);
      }
    }
    
    // Difficulty indicator
    const difficultyIcon = this.scene.add.text(
      this.scene.cameras.main.width / 2 - 210,
      0,
      this.DIFFICULTY_ICONS[challenge.difficulty],
      { fontSize: '20px' }
    ).setOrigin(0.5);
    
    // Challenge icon
    const icon = this.scene.add.text(
      this.scene.cameras.main.width / 2 - 180,
      0,
      challenge.icon,
      { fontSize: '24px' }
    ).setOrigin(0.5);
    
    // Name with difficulty color
    const name = this.scene.add.text(
      this.scene.cameras.main.width / 2 - 140,
      -10,
      challenge.name,
      { 
        fontSize: '16px', 
        color: `#${this.DIFFICULTY_COLORS[challenge.difficulty].toString(16)}`,
        fontStyle: 'bold'
      }
    );
    
    // Description
    const description = this.scene.add.text(
      this.scene.cameras.main.width / 2 - 140,
      10,
      challenge.description,
      { fontSize: '12px', color: '#aaaaaa' }
    );
    
    // Progress with scaling indicator
    const progressText = this.scene.add.text(
      this.scene.cameras.main.width / 2 + 180,
      -10,
      `Progress: ${challenge.progress}/${challenge.requirement.count}`,
      { fontSize: '14px', color: '#ffffff' }
    ).setOrigin(1, 0);
    
    // Reward with scaling indicator
    const rewardText = this.scene.add.text(
      this.scene.cameras.main.width / 2 + 180,
      10,
      this.getScaledRewardText(challenge),
      { fontSize: '12px', color: '#2ecc71' }
    ).setOrigin(1, 0);
    
    // Add chain icon if it exists
    const elements = [background, difficultyIcon, icon, name, description, progressText, rewardText];
    if (chainIcon) {
      elements.unshift(chainIcon);
    }
    
    container.add(elements);
    
    return container;
  }
  
  /**
   * Creates a row for a reward
   */
  private createRewardRow(challenge: Challenge, yOffset: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, yOffset);
    
    // Background with difficulty color
    const background = this.scene.add.rectangle(
      this.scene.cameras.main.width / 2,
      0,
      450, 50, 0x333333, 0.8
    );
    background.setStrokeStyle(2, this.DIFFICULTY_COLORS[challenge.difficulty]);
    
    // Difficulty indicator
    const difficultyIcon = this.scene.add.text(
      this.scene.cameras.main.width / 2 - 210,
      0,
      this.DIFFICULTY_ICONS[challenge.difficulty],
      { fontSize: '20px' }
    ).setOrigin(0.5);
    
    // Challenge icon
    const icon = this.scene.add.text(
      this.scene.cameras.main.width / 2 - 180,
      0,
      challenge.icon,
      { fontSize: '24px' }
    ).setOrigin(0.5);
    
    // Name with difficulty color
    const name = this.scene.add.text(
      this.scene.cameras.main.width / 2 - 140,
      -10,
      challenge.name,
      { 
        fontSize: '16px', 
        color: `#${this.DIFFICULTY_COLORS[challenge.difficulty].toString(16)}`,
        fontStyle: 'bold'
      }
    );
    
    // Get reward description with scaling
    const rewardDescription = this.getScaledRewardText(challenge);
    
    // Description
    const description = this.scene.add.text(
      this.scene.cameras.main.width / 2 - 140,
      10,
      rewardDescription,
      { fontSize: '12px', color: '#2ecc71' }
    );
    
    // Time remaining
    let timeRemaining = 0;
    if (challenge.timeExpires && this.scene) {
      timeRemaining = Math.max(0, Math.floor((challenge.timeExpires - this.scene.time.now) / 1000));
    }
    
    const timeText = this.scene.add.text(
      this.scene.cameras.main.width / 2 + 180,
      0,
      `${timeRemaining}s`,
      { fontSize: '16px', color: '#ffffff' }
    ).setOrigin(1, 0.5);
    
    // Add elements to container
    container.add([background, difficultyIcon, icon, name, description, timeText]);
    
    return container;
  }
  
  private getScaledRewardText(challenge: Challenge): string {
    const baseText = this.getBaseRewardText(challenge.reward);
    const difficultyText = challenge.difficulty !== 'normal' ? 
      ` (${challenge.difficulty.charAt(0).toUpperCase() + challenge.difficulty.slice(1)})` : '';
    return baseText + difficultyText;
  }

  private getBaseRewardText(reward: { type: string; multiplier: number }): string {
    switch (reward.type) {
      case 'damage':
        return `+${Math.round((reward.multiplier - 1) * 100)}% Damage`;
      case 'range':
        return `+${Math.round((reward.multiplier - 1) * 100)}% Range`;
      case 'speed':
        return `+${Math.round((reward.multiplier - 1) * 100)}% Speed`;
      case 'resources':
        return `+${Math.round((reward.multiplier - 1) * 100)}% Resources`;
      case 'combo':
        return `+${Math.round((reward.multiplier - 1) * 100)}% Combo Effects`;
      default:
        return `${Math.round((reward.multiplier - 1) * 100)}% Bonus`;
    }
  }
  
  /**
   * Sets up the toggle button
   */
  private setupToggleButton(): void {
    const button = this.scene.add.text(
      this.scene.cameras.main.width - 150,
      60,
      '🏆 Challenges',
      { fontSize: '18px', color: '#ffffff' }
    ).setOrigin(0.5);
    
    button.setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.toggleVisibility())
      .on('pointerover', () => button.setStyle({ color: '#3498db' }))
      .on('pointerout', () => button.setStyle({ color: '#ffffff' }));
  }
  
  /**
   * Toggles the visibility of the challenge panel
   */
  toggleVisibility(): void {
    this.isVisible = !this.isVisible;
    this.panel.setVisible(this.isVisible);
    
    // Update challenges when showing panel
    if (this.isVisible) {
      this.updateChallenges();
    }
  }
  
  /**
   * Updates the challenges display
   */
  private updateChallenges(): void {
    if (!this.isVisible) return;

    const chains = this.achievementChallenges.getAllChains();
    const chainStats: ChainStats = {
      totalChains: chains.length,
      completedChains: chains.filter(chain => chain.completed).length,
      totalAchievements: this.achievementChallenges.getChainAchievements().length,
      unlockedAchievements: this.achievementChallenges.getUnlockedChainAchievements().length,
      chainProgress: this.calculateChainProgress(chains),
      achievementPoints: this.calculateAchievementPoints(this.achievementChallenges.getUnlockedChainAchievements())
    };

    this.panel.removeAll();
    const newPanel = this.createPanel();
    if (newPanel.list) {
      this.panel.add(newPanel.list);
    }

    this.updateStatsDisplay(chainStats);
  }
  
  private updateStatsDisplay(stats: ChainStats): void {
    // Update the stats display with the current values
    const container = this.createStatsDisplay(stats);
    if (container) {
      this.panel.add(container);
    }
  }
  
  /**
   * Destroys the panel
   */
  destroy(): void {
    if (this.updateTimer) {
      this.updateTimer.remove();
    }
    this.panel.destroy();
  }

  /**
   * Adds chain statistics section
   */
  private addChainStatisticsSection(panel: Phaser.GameObjects.Container): void {
    // Section title
    const sectionTitle = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2 + 200,  // Positioned below other sections
      'Chain Statistics',
      { fontSize: '20px', color: '#3498db', fontStyle: 'bold' }
    ).setOrigin(0.5);
    
    panel.add(sectionTitle);

    // Calculate statistics
    const chains = this.achievementChallenges.getAllChains();
    const achievements = this.achievementChallenges.getChainAchievements();
    const unlockedAchievements = this.achievementChallenges.getUnlockedChainAchievements();
    
    const stats = {
      totalChains: chains.length,
      completedChains: chains.filter(chain => chain.completed).length,
      totalAchievements: achievements.length,
      unlockedAchievements: unlockedAchievements.length,
      chainProgress: this.calculateChainProgress(chains),
      achievementPoints: this.calculateAchievementPoints(unlockedAchievements)
    };

    // Create stats display
    const statsContainer = this.createStatsDisplay(stats);
    statsContainer.setPosition(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2 + 230
    );
    
    panel.add(statsContainer);
  }

  /**
   * Calculate total chain progress as a percentage
   */
  private calculateChainProgress(chains: Chain[]): number {
    if (chains.length === 0) return 0;
    
    const totalProgress = chains.reduce((sum, chain) => {
      const chainChallenges = this.achievementChallenges.getChallengesInChain(chain.id);
      const completedChallenges = chainChallenges.filter(c => c.completed).length;
      return sum + (completedChallenges / chainChallenges.length);
    }, 0);
    
    return Math.round((totalProgress / chains.length) * 100);
  }

  /**
   * Calculate achievement points based on unlocked achievements
   */
  private calculateAchievementPoints(achievements: ChainAchievement[]): number {
    return achievements.reduce((points, achievement) => {
      // Use a default value if the requirement type is not available
      const basePoints = 50;
      // Bonus points based on reward multiplier
      const bonusPoints = Math.round((achievement.reward.effect.multiplier - 1) * 100);
      return points + basePoints + bonusPoints;
    }, 0);
  }

  /**
   * Creates the statistics display
   */
  private createStatsDisplay(stats: ChainStats): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);
    
    // Background
    const background = this.scene.add.rectangle(
      0, 0,
      450, 120,
      0x333333, 0.8
    );
    background.setStrokeStyle(2, 0x3498db);
    
    // Create stat rows
    const rows = [
      { label: 'Chain Mastery:', value: `${stats.completedChains}/${stats.totalChains} chains (${stats.chainProgress}%)` },
      { label: 'Achievements:', value: `${stats.unlockedAchievements}/${stats.totalAchievements} unlocked` },
      { label: 'Achievement Points:', value: `${stats.achievementPoints} points` }
    ];
    
    rows.forEach((row, index) => {
      // Label
      const label = this.scene.add.text(
        -200,
        -40 + (index * 30),
        row.label,
        { fontSize: '16px', color: '#ffffff', fontStyle: 'bold' }
      );
      
      // Value
      const value = this.scene.add.text(
        -50,
        -40 + (index * 30),
        row.value,
        { fontSize: '16px', color: '#2ecc71' }
      );
      
      container.add([label, value]);
    });
    
    // Add progress bar for overall completion
    const progressBar = this.createProgressBar(stats.chainProgress);
    progressBar.setPosition(0, 50);
    
    container.add([background, progressBar]);
    
    return container;
  }

  /**
   * Creates a progress bar
   */
  private createProgressBar(percentage: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);
    
    // Background bar
    const background = this.scene.add.rectangle(
      0, 0,
      400, 20,
      0x666666
    );
    
    // Progress bar
    const progress = this.scene.add.rectangle(
      -200, 0,  // Align to left
      400 * (percentage / 100), 20,
      0x2ecc71
    );
    progress.setOrigin(0, 0.5);  // Set origin to left center
    
    // Percentage text
    const text = this.scene.add.text(
      0, 0,
      `${percentage}%`,
      { fontSize: '14px', color: '#ffffff' }
    ).setOrigin(0.5);
    
    container.add([background, progress, text]);
    
    return container;
  }
} 