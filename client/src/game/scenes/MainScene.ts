import Phaser from 'phaser';

export default class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;
    const centerY = height / 2;

    // Create title
    const title = this.add.text(centerX, centerY - 150, 'Base Camp Chronicles', {
      fontSize: '48px',
      color: '#00ff00',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);

    // Create subtitle
    const subtitle = this.add.text(centerX, centerY - 80, 'A Tower Defense Adventure', {
      fontSize: '24px',
      color: '#ffffff'
    });
    subtitle.setOrigin(0.5);

    // Create buttons
    this.createButton(centerX, centerY, 'Start Game', () => {
      this.scene.start('GameScene');
    });

    this.createButton(centerX, centerY + 70, 'How to Play', () => {
      this.showTutorial();
    });

    this.createButton(centerX, centerY + 140, 'Credits', () => {
      this.showCredits();
    });

    // Create version text
    const version = this.add.text(width - 10, height - 10, 'v0.1.0', {
      fontSize: '16px',
      color: '#666666'
    });
    version.setOrigin(1);
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Button background
    const bg = this.add.rectangle(0, 0, 200, 50, 0x333333);
    bg.setStrokeStyle(2, 0x666666);

    // Button text
    const buttonText = this.add.text(0, 0, text, {
      fontSize: '24px',
      color: '#ffffff'
    });
    buttonText.setOrigin(0.5);

    container.add([bg, buttonText]);

    // Make interactive
    bg.setInteractive()
      .on('pointerover', () => {
        bg.setStrokeStyle(2, 0x00ff00);
        buttonText.setColor('#00ff00');
      })
      .on('pointerout', () => {
        bg.setStrokeStyle(2, 0x666666);
        buttonText.setColor('#ffffff');
      })
      .on('pointerdown', onClick);

    return container;
  }

  private showTutorial(): void {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;
    const tutorialText = [
      'How to Play:',
      '',
      '1. Build turrets to defend your base',
      '2. Collect resources to upgrade your defenses',
      '3. Survive increasingly difficult waves',
      '4. Unlock achievements and special abilities',
      '',
      'Controls:',
      '- Left click to select and place buildings',
      '- Right click to cancel placement',
      '- Click buildings to view info and upgrade',
      '',
      'Click anywhere to close'
    ];

    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.8);
    overlay.setOrigin(0);

    const text = this.add.text(centerX, 100, tutorialText, {
      fontSize: '20px',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 10
    });
    text.setOrigin(0.5, 0);

    const container = this.add.container(0, 0, [overlay, text]);
    container.setDepth(1000);

    overlay.setInteractive()
      .on('pointerdown', () => {
        container.destroy();
      });
  }

  private showCredits(): void {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;
    const creditsText = [
      'Credits',
      '',
      'Game Design & Development',
      'Your Name',
      '',
      'Built with:',
      'Phaser 3',
      'TypeScript',
      '',
      'Special Thanks:',
      'The Phaser Community',
      '',
      'Click anywhere to close'
    ];

    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.8);
    overlay.setOrigin(0);

    const text = this.add.text(centerX, 100, creditsText, {
      fontSize: '20px',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 10
    });
    text.setOrigin(0.5, 0);

    const container = this.add.container(0, 0, [overlay, text]);
    container.setDepth(1000);

    overlay.setInteractive()
      .on('pointerdown', () => {
        container.destroy();
      });
  }
} 