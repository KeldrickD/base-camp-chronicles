import Phaser from 'phaser';
import { AbilityAssets } from '../assets/AbilityAssets';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Create loading bar
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(240, 270, 320, 50);

    // Loading text
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      font: '20px monospace',
      color: '#ffffff'
    });
    loadingText.setOrigin(0.5, 0.5);

    // Loading progress
    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(250, 280, 300 * value, 30);
    });

    // Loading complete
    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // Generate ability icons
    this.generateAbilityIcons();

    // Load other game assets
    this.loadGameAssets();
  }

  private generateAbilityIcons(): void {
    // Create a graphics object for each ability icon
    Object.values(AbilityAssets).forEach(asset => {
      const graphics = this.add.graphics();
      
      // Clear background
      graphics.clear();
      
      // Draw icon background (32x32 transparent)
      graphics.fillStyle(0x000000, 0);
      graphics.fillRect(0, 0, 32, 32);
      
      // Center the drawing
      graphics.translateCanvas(16, 16);
      
      // Draw the icon
      asset.iconShape(graphics);
      
      // Generate texture
      graphics.generateTexture(asset.key, 32, 32);
      graphics.destroy();
    });
  }

  private loadGameAssets(): void {
    // Load particle textures
    this.createParticleTextures();

    // Load other game textures and assets
    this.load.image('particle', 'assets/particles/particle.png');
    this.load.image('resource-particle', 'assets/particles/resource-particle.png');
    this.load.image('impact-particle', 'assets/particles/impact-particle.png');
    this.load.image('shield-particle', 'assets/particles/shield-particle.png');
    this.load.image('heal-particle', 'assets/particles/heal-particle.png');

    // Load UI assets
    this.load.image('button-background', 'assets/ui/button-background.png');
    this.load.image('panel-background', 'assets/ui/panel-background.png');

    // Load sound effects
    this.load.audio('ability-activate', 'assets/sounds/ability-activate.mp3');
    this.load.audio('ability-ready', 'assets/sounds/ability-ready.mp3');
  }

  private createParticleTextures(): void {
    // Create basic particle texture
    const particleGraphics = this.add.graphics();
    particleGraphics.fillStyle(0xffffff);
    particleGraphics.fillCircle(4, 4, 4);
    particleGraphics.generateTexture('particle', 8, 8);
    particleGraphics.destroy();

    // Create resource particle texture (diamond shape)
    const resourceParticleGraphics = this.add.graphics();
    resourceParticleGraphics.fillStyle(0xffff00);
    resourceParticleGraphics.beginPath();
    resourceParticleGraphics.moveTo(4, 0);  // Top
    resourceParticleGraphics.lineTo(8, 4);  // Right
    resourceParticleGraphics.lineTo(4, 8);  // Bottom
    resourceParticleGraphics.lineTo(0, 4);  // Left
    resourceParticleGraphics.closePath();
    resourceParticleGraphics.fill();
    resourceParticleGraphics.generateTexture('resource-particle', 8, 8);
    resourceParticleGraphics.destroy();
  }

  create(): void {
    // Add any post-load initialization here
    this.scene.start('GameScene');
  }
} 