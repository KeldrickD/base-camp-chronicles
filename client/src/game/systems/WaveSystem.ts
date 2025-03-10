import Phaser from 'phaser';
import { EnemySystem } from './EnemySystem';

interface WaveEnemy {
  type: string;
  count: number;
  delay: number;
  path?: number;
}

interface Wave {
  enemies: WaveEnemy[];
  baseDelay: number;
  reward: {
    metal: number;
    energy: number;
    crystals: number;
  };
}

export class WaveSystem {
  private scene: Phaser.Scene;
  private enemySystem: EnemySystem;
  private currentWave: number = 0;
  private totalWaves: number = 30;
  private waveInProgress: boolean = false;
  private remainingEnemies: number = 0;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private nextWaveTimer?: Phaser.Time.TimerEvent;
  private waves: Wave[];

  constructor(scene: Phaser.Scene, enemySystem: EnemySystem) {
    this.scene = scene;
    this.enemySystem = enemySystem;
    this.waves = this.generateWaves();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Handle wave queries
    this.scene.events.on('queryWave', (callback: (wave: number) => void) => {
      callback(this.currentWave + 1);
    });

    // Handle enemy queries
    this.scene.events.on('queryEnemies', (callback: (count: number) => void) => {
      callback(this.remainingEnemies);
    });
  }

  private generateWaves(): Wave[] {
    const waves: Wave[] = [];
    const totalWaves = 20;

    for (let i = 0; i < totalWaves; i++) {
      const wave = this.generateWave(i);
      waves.push(wave);
    }

    return waves;
  }

  private generateWave(waveIndex: number): Wave {
    const baseDelay = Math.max(500, 2000 - waveIndex * 50); // Spawn rate increases with each wave
    const wave: Wave = {
      enemies: [],
      baseDelay,
      reward: {
        metal: Math.floor(50 + waveIndex * 10),
        energy: Math.floor(30 + waveIndex * 5),
        crystals: Math.floor(10 + waveIndex * 2)
      }
    };

    // Add basic enemies
    wave.enemies.push({
      type: 'scout',
      count: Math.floor(5 + waveIndex),
      delay: baseDelay
    });

    // Add tanks starting from wave 3
    if (waveIndex >= 2) {
      wave.enemies.push({
        type: 'tank',
        count: Math.floor(1 + waveIndex * 0.3),
        delay: baseDelay * 2
      });
    }

    // Add speeders starting from wave 5
    if (waveIndex >= 4) {
      wave.enemies.push({
        type: 'speeder',
        count: Math.floor(2 + waveIndex * 0.5),
        delay: baseDelay * 0.8
      });
    }

    // Add shielded enemies starting from wave 7
    if (waveIndex >= 6) {
      wave.enemies.push({
        type: 'shielded',
        count: Math.floor(1 + waveIndex * 0.2),
        delay: baseDelay * 1.5
      });
    }

    // Add swarm enemies starting from wave 10
    if (waveIndex >= 9) {
      wave.enemies.push({
        type: 'swarm',
        count: Math.floor(5 + waveIndex),
        delay: baseDelay * 0.5
      });
    }

    // Distribute enemies across different paths
    wave.enemies.forEach(enemy => {
      enemy.path = Math.floor(Math.random() * 3); // Assuming 3 paths
    });

    return wave;
  }

  public update(_delta: number): void {
    // Check wave completion
    if (this.waveInProgress && this.enemySystem.getActiveEnemyCount() === 0) {
      this.waveInProgress = false;
      this.scene.events.emit('waveCompleted', {
        wave: this.currentWave,
        nextWaveDelay: 10000
      });
    }
  }

  public getCurrentWave(): number {
    return this.currentWave;
  }

  public isWaveSetComplete(): boolean {
    return this.currentWave >= this.totalWaves;
  }

  public startNextWave(): void {
    this.currentWave++;
    this.waveInProgress = true;
    this.scene.events.emit('waveStarted', { wave: this.currentWave });
  }

  public getRemainingEnemies(): number {
    return this.remainingEnemies;
  }

  public destroy(): void {
    if (this.spawnTimer) this.spawnTimer.destroy();
    if (this.nextWaveTimer) this.nextWaveTimer.destroy();
  }
} 