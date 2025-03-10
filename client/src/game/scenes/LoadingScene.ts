import Phaser from 'phaser';

export class LoadingScene extends Phaser.Scene {
  private loadingBar!: Phaser.GameObjects.Graphics;
  private progressBar!: Phaser.GameObjects.Graphics;
  private loadingText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'LoadingScene' });
  }

  preload(): void {
    this.createLoadingBar();
    this.createPlaceholderAssets();

    // Load audio
    this.load.audio('shoot', 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU');
    this.load.audio('laser', 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU');
    this.load.audio('missile', 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU');
    this.load.audio('tesla', 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU');
    this.load.audio('explosion', 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU');
    this.load.audio('build', 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU');
    this.load.audio('upgrade', 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU');
    this.load.audio('wave-start', 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU');
    this.load.audio('game-over', 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU');
    this.load.audio('victory', 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU');

    // Update loading bar
    this.load.on('progress', this.updateLoadingBar, this);
    this.load.on('complete', this.onLoadComplete, this);
  }

  private createPlaceholderAssets(): void {
    // Create turret graphics
    this.createTurretGraphic('turret', 0x00ff00);
    this.createTurretGraphic('laser-turret', 0xff0000);
    this.createTurretGraphic('missile-turret', 0xff8800);
    this.createTurretGraphic('tesla-turret', 0x00ffff);
    this.createBuildingGraphic('shield', 0x0088ff);
    this.createBuildingGraphic('collector', 0xffff00);
    this.createBuildingGraphic('generator', 0xff00ff);

    // Create enemy graphics
    this.createEnemyGraphic('enemy-scout', 0x00ff88, 16);
    this.createEnemyGraphic('enemy-tank', 0x888888, 24);
    this.createEnemyGraphic('enemy-speeder', 0xff8800, 12);
    this.createEnemyGraphic('enemy-shielded', 0x0088ff, 20);
    this.createEnemyGraphic('enemy-swarm', 0xff00ff, 8);

    // Create projectile graphics
    this.createProjectileGraphic('projectile-basic', 0x00ff00);
    this.createProjectileGraphic('projectile-laser', 0xff0000);
    this.createProjectileGraphic('projectile-missile', 0xff8800);
    this.createProjectileGraphic('projectile-tesla', 0x00ffff);

    // Create effect graphics
    this.createEffectGraphic('explosion', 0xff4400);
    this.createEffectGraphic('laser-impact', 0xff0000);
    this.createEffectGraphic('missile-explosion', 0xff8800);
    this.createEffectGraphic('tesla-arc', 0x00ffff);
    this.createEffectGraphic('shield-effect', 0x0088ff);
    this.createEffectGraphic('heal-effect', 0x00ff88);

    // Create resource graphics
    this.createResourceGraphic('resource-metal', 0xcccccc);
    this.createResourceGraphic('resource-energy', 0xffff00);
    this.createResourceGraphic('resource-crystals', 0x00ffff);

    // Create base graphic
    this.createBaseGraphic();
  }

  private createTurretGraphic(key: string, color: number): void {
    const graphics = this.add.graphics();
    
    // Base
    graphics.lineStyle(2, color);
    graphics.strokeCircle(16, 16, 14);
    graphics.fillStyle(color, 0.3);
    graphics.fillCircle(16, 16, 14);

    // Barrel
    graphics.lineStyle(4, color);
    graphics.lineBetween(16, 16, 16, 0);

    graphics.generateTexture(key, 32, 32);
    graphics.destroy();
  }

  private createBuildingGraphic(key: string, color: number): void {
    const graphics = this.add.graphics();
    
    // Building shape
    graphics.lineStyle(2, color);
    graphics.strokeRect(2, 2, 28, 28);
    graphics.fillStyle(color, 0.3);
    graphics.fillRect(2, 2, 28, 28);

    graphics.generateTexture(key, 32, 32);
    graphics.destroy();
  }

  private createProjectileGraphic(key: string, color: number): void {
    const graphics = this.add.graphics();
    
    graphics.lineStyle(2, color);
    graphics.fillStyle(color, 1);
    graphics.beginPath();
    graphics.arc(4, 4, 3, 0, Math.PI * 2);
    graphics.closePath();
    graphics.strokePath();
    graphics.fillPath();

    graphics.generateTexture(key, 8, 8);
    graphics.destroy();
  }

  private createEffectGraphic(key: string, color: number): void {
    const graphics = this.add.graphics();
    
    graphics.lineStyle(2, color);
    graphics.fillStyle(color, 0.5);
    graphics.beginPath();
    graphics.arc(16, 16, 14, 0, Math.PI * 2);
    graphics.closePath();
    graphics.strokePath();
    graphics.fillPath();

    graphics.generateTexture(key, 32, 32);
    graphics.destroy();
  }

  private createEnemyGraphic(key: string, color: number, size: number): void {
    const graphics = this.add.graphics();
    
    // Enemy body
    graphics.lineStyle(2, color);
    graphics.strokeCircle(size/2, size/2, size/2 - 2);
    graphics.fillStyle(color, 0.3);
    graphics.fillCircle(size/2, size/2, size/2 - 2);

    // Direction indicator
    graphics.lineStyle(2, color);
    graphics.lineBetween(size/2, size/2, size, size/2);

    // Generate the texture
    graphics.generateTexture(key, size, size);
    graphics.destroy();
  }

  private createResourceGraphic(key: string, color: number): void {
    const graphics = this.add.graphics();
    
    // Resource icon background
    graphics.lineStyle(2, color);
    graphics.fillStyle(color, 0.3);
    graphics.beginPath();
    graphics.arc(12, 12, 10, 0, Math.PI * 2);
    graphics.closePath();
    graphics.strokePath();
    graphics.fillPath();

    // Resource icon symbol
    graphics.lineStyle(2, color);
    if (key.includes('metal')) {
      // Metal icon (hammer)
      graphics.moveTo(8, 8);
      graphics.lineTo(16, 16);
      graphics.moveTo(16, 8);
      graphics.lineTo(8, 16);
    } else if (key.includes('energy')) {
      // Energy icon (lightning bolt)
      graphics.moveTo(12, 6);
      graphics.lineTo(8, 12);
      graphics.lineTo(12, 12);
      graphics.lineTo(12, 18);
    } else if (key.includes('crystals')) {
      // Crystal icon (diamond)
      graphics.moveTo(12, 6);
      graphics.lineTo(16, 12);
      graphics.lineTo(12, 18);
      graphics.lineTo(8, 12);
      graphics.lineTo(12, 6);
    }

    graphics.generateTexture(key, 24, 24);
    graphics.destroy();
  }

  private createBaseGraphic(): void {
    const graphics = this.add.graphics();
    
    // Base structure
    graphics.lineStyle(3, 0x00ff00);
    graphics.strokeCircle(32, 32, 28);
    graphics.fillStyle(0x004400);
    graphics.fillCircle(32, 32, 28);

    // Inner details
    graphics.lineStyle(2, 0x00ff00);
    graphics.beginPath();
    graphics.moveTo(32, 12);
    graphics.lineTo(32, 52);
    graphics.moveTo(12, 32);
    graphics.lineTo(52, 32);
    graphics.strokePath();

    // Generate texture
    graphics.generateTexture('base', 64, 64);
    graphics.destroy();
  }

  private createLoadingBar(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Create loading bar background
    this.loadingBar = this.add.graphics();
    this.loadingBar.fillStyle(0x222222, 0.8);
    this.loadingBar.fillRect(width / 4, height / 2 - 20, width / 2, 40);

    // Create progress bar
    this.progressBar = this.add.graphics();

    // Create loading text
    this.loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      fontSize: '24px',
      color: '#ffffff'
    });
    this.loadingText.setOrigin(0.5);
  }

  private updateLoadingBar(value: number): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.progressBar.clear();
    this.progressBar.fillStyle(0x00ff00, 1);
    this.progressBar.fillRect(
      width / 4,
      height / 2 - 20,
      (width / 2) * value,
      40
    );

    const percent = Math.round(value * 100);
    this.loadingText.setText(`Loading... ${percent}%`);
  }

  private onLoadComplete(): void {
    this.scene.start('MainScene');
  }
} 