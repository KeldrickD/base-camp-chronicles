import Phaser from 'phaser';

interface GameStats {
  score: number;
  wavesCompleted: number;
  enemiesDefeated: number;
  buildingsPlaced: number;
  resourcesCollected: {
    metal: number;
    energy: number;
    crystals: number;
  };
  timePlayed: number;
}

export class GameOverScene extends Phaser.Scene {
  private stats!: GameStats;
  private isVictory: boolean = false;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: { stats: GameStats; victory: boolean }): void {
    this.stats = data.stats;
    this.isVictory = data.victory;
  }

  create(): void {
    // Create background overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

    // Create container for content
    const container = this.add.container(this.cameras.main.centerX, 100);

    // Add title
    const title = this.add.text(0, 0, this.isVictory ? 'Victory!' : 'Game Over', {
      fontSize: '64px',
      color: this.isVictory ? '#00ff00' : '#ff0000',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(title);

    // Add stats
    const stats = this.createStatsDisplay();
    stats.setPosition(0, 100);
    container.add(stats);

    // Add achievements earned
    const achievements = this.createAchievementsDisplay();
    achievements.setPosition(0, stats.height + 150);
    container.add(achievements);

    // Add buttons
    this.createButtons();

    // Play sound
    this.sound.play(this.isVictory ? 'victory' : 'game-over', { volume: 0.5 });

    // Add particles
    if (this.isVictory) {
      this.createVictoryParticles();
    }
  }

  private createStatsDisplay(): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);

    const statsText = [
      `Score: ${this.stats.score}`,
      `Waves Completed: ${this.stats.wavesCompleted}`,
      `Enemies Defeated: ${this.stats.enemiesDefeated}`,
      `Buildings Placed: ${this.stats.buildingsPlaced}`,
      '\nResources Collected:',
      `Metal: ${Math.floor(this.stats.resourcesCollected.metal)}`,
      `Energy: ${Math.floor(this.stats.resourcesCollected.energy)}`,
      `Crystals: ${Math.floor(this.stats.resourcesCollected.crystals)}`,
      `\nTime Played: ${this.formatTime(this.stats.timePlayed)}`
    ];

    let yOffset = 0;
    statsText.forEach(text => {
      const statText = this.add.text(0, yOffset, text, {
        fontSize: '24px',
        color: '#ffffff'
      }).setOrigin(0.5);
      container.add(statText);
      yOffset += 30;
    });

    return container;
  }

  private createAchievementsDisplay(): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);

    // Add title
    const title = this.add.text(0, 0, 'Achievements Earned', {
      fontSize: '32px',
      color: '#ffff00',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(title);

    // Check achievements
    const achievements = this.checkAchievements();
    
    // Display earned achievements
    let yOffset = 50;
    achievements.forEach(achievement => {
      const icon = this.add.sprite(0, yOffset, 'achievement-icon');
      icon.setScale(0.5);
      
      const text = this.add.text(30, yOffset - 10, achievement, {
        fontSize: '20px',
        color: '#ffffff'
      }).setOrigin(0, 0.5);

      container.add([icon, text]);
      yOffset += 40;
    });

    return container;
  }

  private checkAchievements(): string[] {
    const achievements: string[] = [];

    // Victory achievements
    if (this.isVictory) {
      achievements.push('Base Defense Master');
    }

    // Wave achievements
    if (this.stats.wavesCompleted >= 20) {
      achievements.push('Wave Conqueror');
    } else if (this.stats.wavesCompleted >= 10) {
      achievements.push('Wave Veteran');
    }

    // Combat achievements
    if (this.stats.enemiesDefeated >= 1000) {
      achievements.push('Enemy Exterminator');
    } else if (this.stats.enemiesDefeated >= 500) {
      achievements.push('Enemy Hunter');
    }

    // Building achievements
    if (this.stats.buildingsPlaced >= 50) {
      achievements.push('Master Builder');
    } else if (this.stats.buildingsPlaced >= 25) {
      achievements.push('Construction Expert');
    }

    // Resource achievements
    const totalResources = 
      this.stats.resourcesCollected.metal +
      this.stats.resourcesCollected.energy +
      this.stats.resourcesCollected.crystals;

    if (totalResources >= 10000) {
      achievements.push('Resource Baron');
    } else if (totalResources >= 5000) {
      achievements.push('Resource Collector');
    }

    return achievements;
  }

  private createButtons(): void {
    const buttonStyle = {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    };

    // Retry button
    const retryButton = this.add.text(
      this.cameras.main.centerX - 100,
      this.cameras.main.height - 100,
      'Try Again',
      buttonStyle
    )
      .setInteractive()
      .on('pointerover', () => retryButton.setBackgroundColor('#444444'))
      .on('pointerout', () => retryButton.setBackgroundColor('#333333'))
      .on('pointerdown', () => {
        this.sound.play('click');
        this.scene.start('GameScene');
      });

    // Main menu button
    const menuButton = this.add.text(
      this.cameras.main.centerX + 100,
      this.cameras.main.height - 100,
      'Main Menu',
      buttonStyle
    )
      .setInteractive()
      .on('pointerover', () => menuButton.setBackgroundColor('#444444'))
      .on('pointerout', () => menuButton.setBackgroundColor('#333333'))
      .on('pointerdown', () => {
        this.sound.play('click');
        this.scene.start('MainScene');
      });
  }

  private createVictoryParticles(): void {
    const particles = this.add.particles(0, 0, 'particle', {
      x: { min: 0, max: this.cameras.main.width },
      y: -10,
      quantity: 2,
      frequency: 50,
      lifespan: 4000,
      gravityY: 50,
      scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xffff00, 0x00ff00, 0x00ffff],
      rotate: { min: 0, max: 360 },
      speedY: { min: 100, max: 200 }
    });

    // Auto-destroy after 5 seconds
    this.time.delayedCall(5000, () => particles.destroy());
  }

  private formatTime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (remainingMinutes > 0) parts.push(`${remainingMinutes}m`);
    parts.push(`${remainingSeconds}s`);

    return parts.join(' ');
  }
} 