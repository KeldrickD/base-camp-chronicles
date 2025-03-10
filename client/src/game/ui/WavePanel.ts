import Phaser from 'phaser';
import { WaveSystem } from '../systems/WaveSystem';

export class WavePanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private waveText: Phaser.GameObjects.Text;
  private statusText: Phaser.GameObjects.Text;
  private completeOverlay?: {
    container: Phaser.GameObjects.Container;
    background: Phaser.GameObjects.Rectangle;
    text: Phaser.GameObjects.Text;
    timer: Phaser.GameObjects.Text;
  };
  private waveSystem: WaveSystem;

  constructor(scene: Phaser.Scene, waveSystem: WaveSystem) {
    this.scene = scene;
    this.container = this.scene.add.container(this.scene.cameras.main.centerX, 10);
    this.waveSystem = waveSystem;
    this.createPanel();
  }

  private createPanel(): void {
    // Create wave counter
    this.waveText = this.scene.add.text(0, 0, 'Wave: 1', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 10, y: 5 }
    });

    // Create status text
    this.statusText = this.scene.add.text(0, 40, '', {
      fontSize: '18px',
      color: '#00ff00',
      backgroundColor: '#333333',
      padding: { x: 10, y: 5 }
    });

    this.container.add([this.waveText, this.statusText]);
  }

  public showWaveComplete(wave: number, nextWaveDelay: number): void {
    // Create overlay if it doesn't exist
    if (!this.completeOverlay) {
      const centerX = this.scene.cameras.main.centerX;
      const centerY = this.scene.cameras.main.centerY - 100;

      // Create background
      const background = this.scene.add.rectangle(0, 0, 400, 100, 0x000000, 0.8);

      // Create wave complete text
      const text = this.scene.add.text(0, -20, '', {
        fontSize: '32px',
        color: '#00ff00',
        align: 'center'
      }).setOrigin(0.5);

      // Create timer text
      const timer = this.scene.add.text(0, 20, '', {
        fontSize: '24px',
        color: '#ffffff',
        align: 'center'
      }).setOrigin(0.5);

      // Create container
      const container = this.scene.add.container(centerX, centerY, [background, text, timer]);
      container.setDepth(100);

      this.completeOverlay = {
        container,
        background,
        text,
        timer
      };
    }

    // Update text
    this.completeOverlay.text.setText(`Wave ${wave} Complete!`);
    
    // Start countdown
    let timeLeft = Math.ceil(nextWaveDelay / 1000);
    this.updateTimer(timeLeft);

    this.scene.time.addEvent({
      delay: 1000,
      callback: () => {
        timeLeft--;
        this.updateTimer(timeLeft);
        if (timeLeft <= 0) {
          this.hideWaveComplete();
        }
      },
      repeat: timeLeft - 1
    });

    // Play wave complete sound
    this.scene.sound.play('wave-complete', { volume: 0.5 });
  }

  private updateTimer(seconds: number): void {
    if (this.completeOverlay) {
      this.completeOverlay.timer.setText(`Next Wave in ${seconds}s`);
    }
  }

  private hideWaveComplete(): void {
    if (this.completeOverlay) {
      this.completeOverlay.container.destroy();
      this.completeOverlay = undefined;
    }
  }

  public update(): void {
    const currentWave = this.waveSystem.getCurrentWave();
    const waveText = this.container.getByName('wave-text') as Phaser.GameObjects.Text;
    if (waveText) {
      waveText.setText(`Wave ${currentWave}`);
    }

    // Update status text if needed
    this.scene.events.emit('queryEnemies', (count: number) => {
      if (count > 0) {
        this.statusText.setText(`Enemies: ${count}`);
        this.statusText.setColor('#ff0000');
      } else {
        this.statusText.setText('Wave Clear!');
        this.statusText.setColor('#00ff00');
      }
    });
  }

  public destroy(): void {
    this.container.destroy();
    if (this.completeOverlay) {
      this.completeOverlay.container.destroy();
    }
  }
} 