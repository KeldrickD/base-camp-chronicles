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

/**
 * Handles visual effects for achievement unlocks
 */
export class AchievementEffects {
  private static instance: AchievementEffects;
  private scene?: Scene;
  
  private constructor() {}
  
  static getInstance(): AchievementEffects {
    if (!AchievementEffects.instance) {
      AchievementEffects.instance = new AchievementEffects();
    }
    return AchievementEffects.instance;
  }
  
  setScene(scene: Scene): void {
    this.scene = scene;
  }
  
  /**
   * Creates a visual celebration effect for an achievement unlock
   */
  celebrateAchievement(achievement: Achievement): void {
    if (!this.scene) return;
    
    // Create base celebration effect
    this.createUnlockPopup(achievement);
    
    // Add tier-specific effects
    if (achievement.tier) {
      switch (achievement.tier) {
        case 'bronze':
          this.createBronzeEffect();
          break;
        case 'silver':
          this.createSilverEffect();
          break;
        case 'gold':
          this.createGoldEffect();
          break;
      }
    }
    
    // Play sound effect
    this.playUnlockSound(achievement.tier);
  }
  
  /**
   * Creates the achievement unlock popup
   */
  private createUnlockPopup(achievement: Achievement): void {
    if (!this.scene) return;
    
    const centerX = this.scene.cameras.main.width / 2;
    const centerY = this.scene.cameras.main.height / 2;
    
    // Create background with tier-specific styling
    const popupBg = this.scene.add.graphics();
    popupBg.fillStyle(0x000000, 0.8);
    popupBg.fillRoundedRect(centerX - 200, centerY - 60, 400, 120, 16);
    
    // Add border based on tier
    let borderColor = 0xffffff;
    if (achievement.tier === 'bronze') borderColor = 0xcd7f32;
    if (achievement.tier === 'silver') borderColor = 0xc0c0c0;
    if (achievement.tier === 'gold') borderColor = 0xffd700;
    
    popupBg.lineStyle(3, borderColor, 1);
    popupBg.strokeRoundedRect(centerX - 200, centerY - 60, 400, 120, 16);
    
    // Create title text
    const titleText = this.scene.add.text(centerX, centerY - 35, 'Achievement Unlocked!', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Add tier badge if applicable
    let tierBadge = '';
    if (achievement.tier === 'bronze') tierBadge = '🥉 ';
    if (achievement.tier === 'silver') tierBadge = '🥈 ';
    if (achievement.tier === 'gold') tierBadge = '🥇 ';
    
    // Create achievement name with tier-specific color
    let nameColor = '#ffffff';
    if (achievement.tier === 'bronze') nameColor = '#cd7f32';
    if (achievement.tier === 'silver') nameColor = '#c0c0c0';
    if (achievement.tier === 'gold') nameColor = '#ffd700';
    
    const achievementText = this.scene.add.text(centerX, centerY, 
      `${tierBadge}${achievement.icon} ${achievement.name}`, {
      fontSize: '20px',
      color: nameColor
    }).setOrigin(0.5);
    
    // Create description text
    const descriptionText = this.scene.add.text(centerX, centerY + 30, 
      achievement.description, {
      fontSize: '16px',
      color: '#aaaaaa'
    }).setOrigin(0.5);
    
    // Create container for all elements
    const container = this.scene.add.container(0, 0, [
      popupBg, titleText, achievementText, descriptionText
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
   * Creates bronze tier specific effects
   */
  private createBronzeEffect(): void {
    if (!this.scene) return;
    
    const centerX = this.scene.cameras.main.width / 2;
    const centerY = this.scene.cameras.main.height / 2;
    
    // Simple bronze particle effect
    const particles = this.scene.add.particles(0, 0, 'particle', {
      x: centerX,
      y: centerY,
      speed: { min: 50, max: 150 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      lifespan: 1000,
      quantity: 20,
      tint: 0xcd7f32
    });
    
    // Clean up after animation completes
    this.scene.time.delayedCall(2000, () => {
      particles.destroy();
    });
  }
  
  /**
   * Creates silver tier specific effects
   */
  private createSilverEffect(): void {
    if (!this.scene) return;
    
    const centerX = this.scene.cameras.main.width / 2;
    const centerY = this.scene.cameras.main.height / 2;
    
    // Silver particle effect
    const particles = this.scene.add.particles(0, 0, 'particle', {
      x: centerX,
      y: centerY,
      speed: { min: 70, max: 180 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.6, end: 0 },
      lifespan: 1500,
      quantity: 30,
      tint: 0xc0c0c0
    });
    
    // Add a flash effect
    const flash = this.scene.add.rectangle(
      centerX, centerY, 
      this.scene.cameras.main.width, 
      this.scene.cameras.main.height, 
      0xffffff
    );
    flash.setAlpha(0.3);
    
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        flash.destroy();
      }
    });
    
    // Clean up after animation completes
    this.scene.time.delayedCall(2500, () => {
      particles.destroy();
    });
  }
  
  /**
   * Creates gold tier specific effects
   */
  private createGoldEffect(): void {
    if (!this.scene) return;
    
    const centerX = this.scene.cameras.main.width / 2;
    const centerY = this.scene.cameras.main.height / 2;
    
    // Gold particle burst
    const particles = this.scene.add.particles(0, 0, 'particle', {
      x: centerX,
      y: centerY,
      speed: { min: 100, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.8, end: 0 },
      lifespan: 2000,
      quantity: 50,
      tint: 0xffd700
    });
    
    // Add a stronger flash effect
    const flash = this.scene.add.rectangle(
      centerX, centerY, 
      this.scene.cameras.main.width, 
      this.scene.cameras.main.height, 
      0xffffff
    );
    flash.setAlpha(0.5);
    
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 800,
      onComplete: () => {
        flash.destroy();
      }
    });
    
    // Add radial wave effect
    const circle = this.scene.add.circle(centerX, centerY, 10, 0xffd700, 0.7);
    
    this.scene.tweens.add({
      targets: circle,
      radius: 500,
      alpha: 0,
      duration: 1500,
      ease: 'Sine.Out',
      onComplete: () => {
        circle.destroy();
      }
    });
    
    // Add screen shake effect
    this.scene.cameras.main.shake(300, 0.01);
    
    // Clean up after animation completes
    this.scene.time.delayedCall(3000, () => {
      particles.destroy();
    });
  }
  
  /**
   * Plays appropriate sound effect for achievement unlock
   */
  private playUnlockSound(tier?: string): void {
    if (!this.scene) return;
    
    // Play different sounds based on tier
    if (tier === 'gold') {
      // Gold achievement sound (triumphant)
      this.scene.sound.play('achievement_gold', { volume: 0.7 });
    } else if (tier === 'silver') {
      // Silver achievement sound (celebratory)
      this.scene.sound.play('achievement_silver', { volume: 0.5 });
    } else {
      // Bronze or no tier achievement sound (simple)
      this.scene.sound.play('achievement_bronze', { volume: 0.3 });
    }
  }
  
  /**
   * Preloads required assets for achievement effects
   */
  preloadAssets(scene: Scene): void {
    // Preload particle texture if not already loaded
    if (!scene.textures.exists('particle')) {
      scene.load.image('particle', 'assets/images/particle.png');
    }
    
    // Preload sound effects if not already loaded
    if (!scene.cache.audio.exists('achievement_bronze')) {
      scene.load.audio('achievement_bronze', 'assets/sounds/achievement_bronze.mp3');
    }
    
    if (!scene.cache.audio.exists('achievement_silver')) {
      scene.load.audio('achievement_silver', 'assets/sounds/achievement_silver.mp3');
    }
    
    if (!scene.cache.audio.exists('achievement_gold')) {
      scene.load.audio('achievement_gold', 'assets/sounds/achievement_gold.mp3');
    }
  }
  
  destroy(): void {
    // Clean up any resources
    this.scene = undefined;
  }
} 