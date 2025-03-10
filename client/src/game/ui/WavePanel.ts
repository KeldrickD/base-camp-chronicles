import Phaser from 'phaser';
import { WaveSystem } from '../systems/WaveSystem';
import { EnemySystem } from '../systems/EnemySystem';

interface GameScene extends Phaser.Scene {
  enemySystem: EnemySystem;
}

export class WavePanel {
  private scene: GameScene;
  private waveSystem: WaveSystem;
  private container: Phaser.GameObjects.Container;
  private waveText!: Phaser.GameObjects.Text;
  private enemyCountText!: Phaser.GameObjects.Text;
  private waveCompleteText!: Phaser.GameObjects.Text;
  private rewardText!: Phaser.GameObjects.Text;
  private nextWaveButton!: Phaser.GameObjects.Container;

  constructor(scene: GameScene, waveSystem: WaveSystem) {
    this.scene = scene;
    this.waveSystem = waveSystem;
    this.container = this.createContainer();
  }

  private createContainer(): Phaser.GameObjects.Container {
    const container = this.scene.add.container(10, 10);
    container.setDepth(100);

    // Background panel
    const bg = this.scene.add.rectangle(0, 0, 200, 100, 0x000000, 0.7);
    bg.setOrigin(0, 0);
    container.add(bg);

    // Wave information
    this.waveText = this.scene.add.text(10, 10, 'Wave: 1', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    container.add(this.waveText);

    // Enemy count
    this.enemyCountText = this.scene.add.text(10, 35, 'Enemies: 0', {
      fontSize: '14px',
      color: '#ffffff'
    });
    container.add(this.enemyCountText);

    // Wave complete text (hidden by default)
    this.waveCompleteText = this.scene.add.text(10, 60, 'Wave Complete!', {
      fontSize: '16px',
      color: '#00ff00',
      fontStyle: 'bold'
    });
    this.waveCompleteText.setVisible(false);
    container.add(this.waveCompleteText);

    // Reward text (hidden by default)
    this.rewardText = this.scene.add.text(10, 80, '', {
      fontSize: '14px',
      color: '#ffff00'
    });
    this.rewardText.setVisible(false);
    container.add(this.rewardText);

    // Next wave button (hidden by default)
    this.nextWaveButton = this.createNextWaveButton();
    this.nextWaveButton.setVisible(false);
    container.add(this.nextWaveButton);

    return container;
  }

  private createNextWaveButton(): Phaser.GameObjects.Container {
    const container = this.scene.add.container(50, 120);

    // Button background
    const bg = this.scene.add.rectangle(0, 0, 100, 30, 0x4a4a4a);
    bg.setInteractive({ useHandCursor: true })
      .on('pointerover', () => bg.setFillStyle(0x666666))
      .on('pointerout', () => bg.setFillStyle(0x4a4a4a))
      .on('pointerdown', () => {
        this.waveSystem.startNextWave();
        this.hideWaveComplete();
      });

    // Button text
    const text = this.scene.add.text(0, 0, 'Next Wave', {
      fontSize: '14px',
      color: '#ffffff'
    });
    text.setOrigin(0.5);

    container.add([bg, text]);
    return container;
  }

  public updateWaveInfo(waveNumber: number): void {
    this.waveText.setText(`Wave: ${waveNumber}`);
    
    // Add boss wave indicator
    if (waveNumber % 5 === 0) {
      this.waveText.setText(`Wave: ${waveNumber} (BOSS)`);
      this.waveText.setColor('#ff0000');
    } else {
      this.waveText.setColor('#ffffff');
    }
  }

  public showWaveComplete(waveNumber: number, reward: number): void {
    // Show wave complete message
    this.waveCompleteText.setVisible(true);
    
    // Show reward
    this.rewardText.setText(`Reward: ${reward}`);
    this.rewardText.setVisible(true);

    // Show next wave button if not final wave
    if (!this.waveSystem.isWaveSetComplete()) {
      this.nextWaveButton.setVisible(true);

      // Add visual effects
      this.scene.tweens.add({
        targets: [this.waveCompleteText, this.rewardText],
        alpha: { from: 0, to: 1 },
        duration: 500,
        ease: 'Power2'
      });

      // Pulse effect on the next wave button
      this.scene.tweens.add({
        targets: this.nextWaveButton,
        scaleX: { from: 1, to: 1.1 },
        scaleY: { from: 1, to: 1.1 },
        duration: 1000,
        yoyo: true,
        repeat: -1
      });
    } else {
      this.waveCompleteText.setText('All Waves Complete!');
      this.waveCompleteText.setColor('#00ff00');
    }
  }

  public hideWaveComplete(): void {
    this.waveCompleteText.setVisible(false);
    this.rewardText.setVisible(false);
    this.nextWaveButton.setVisible(false);
    this.scene.tweens.killTweensOf(this.nextWaveButton);
  }

  public update(): void {
    if (this.waveSystem.isWaveInProgress()) {
      const activeEnemies = this.scene.enemySystem.getActiveEnemyCount();
      this.enemyCountText.setText(`Enemies: ${activeEnemies}`);
    }
  }
} 