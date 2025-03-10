import Phaser from 'phaser';
import { EnemySystem, EnemyType } from './EnemySystem';

interface WaveConfig {
  enemies: {
    type: EnemyType;
    count: number;
    delay: number;
    pathIndex?: number;
  }[];
  reward: number;
  bossWave?: boolean;
}

export class WaveSystem {
  private scene: Phaser.Scene;
  private enemySystem: EnemySystem;
  private currentWave: number;
  private isWaveActive: boolean;
  private spawnTimer: number;
  private currentWaveConfig: WaveConfig | null;
  private currentEnemyIndex: number;
  private currentEnemyCount: number;
  private totalWaves: number;
  private difficultyMultiplier: number;

  constructor(scene: Phaser.Scene, enemySystem: EnemySystem) {
    this.scene = scene;
    this.enemySystem = enemySystem;
    this.currentWave = 0;
    this.isWaveActive = false;
    this.spawnTimer = 0;
    this.currentWaveConfig = null;
    this.currentEnemyIndex = 0;
    this.currentEnemyCount = 0;
    this.totalWaves = 10;
    this.difficultyMultiplier = 1;
  }

  private getWaveConfig(waveNumber: number): WaveConfig {
    const baseConfig = this.getBaseWaveConfig(waveNumber);
    this.applyDifficultyScaling(baseConfig, waveNumber);
    return baseConfig;
  }

  private getBaseWaveConfig(waveNumber: number): WaveConfig {
    // Boss waves every 5 waves
    const isBossWave = waveNumber % 5 === 0;

    if (isBossWave) {
      return this.getBossWaveConfig(waveNumber);
    }

    // Regular waves with increasing complexity
    const config: WaveConfig = {
      enemies: [],
      reward: 100 + waveNumber * 50,
      bossWave: false
    };

    // Add basic enemies (decrease count as waves progress)
    const basicCount = Math.max(5, 15 - Math.floor(waveNumber / 2));
    config.enemies.push({
      type: EnemyType.BASIC,
      count: basicCount,
      delay: 1000
    });

    // Add fast enemies (increase count as waves progress)
    if (waveNumber >= 2) {
      const fastCount = Math.min(10, Math.floor(waveNumber / 2));
      config.enemies.push({
        type: EnemyType.FAST,
        count: fastCount,
        delay: 800
      });
    }

    // Add tank enemies
    if (waveNumber >= 3) {
      const tankCount = Math.min(5, Math.floor(waveNumber / 3));
      config.enemies.push({
        type: EnemyType.TANK,
        count: tankCount,
        delay: 2000
      });
    }

    // Add shielded enemies
    if (waveNumber >= 4) {
      const shieldedCount = Math.min(3, Math.floor(waveNumber / 4));
      config.enemies.push({
        type: EnemyType.SHIELDED,
        count: shieldedCount,
        delay: 3000
      });
    }

    // Randomize enemy paths
    config.enemies.forEach(enemy => {
      enemy.pathIndex = Math.floor(Math.random() * 2); // Assuming 2 paths
    });

    return config;
  }

  private getBossWaveConfig(waveNumber: number): WaveConfig {
    const config: WaveConfig = {
      enemies: [
        {
          type: EnemyType.BOSS,
          count: 1,
          delay: 2000
        }
      ],
      reward: 500 + waveNumber * 100,
      bossWave: true
    };

    // Add support enemies
    if (waveNumber >= 10) {
      config.enemies.push({
        type: EnemyType.SHIELDED,
        count: 2,
        delay: 1000
      });
    }

    return config;
  }

  private applyDifficultyScaling(config: WaveConfig, waveNumber: number): void {
    const scalingFactor = 1 + (waveNumber - 1) * 0.1; // 10% increase per wave

    config.enemies.forEach(enemy => {
      // Scale enemy count (except for boss waves)
      if (!config.bossWave) {
        enemy.count = Math.ceil(enemy.count * this.difficultyMultiplier);
      }

      // Scale spawn delay (faster spawns in later waves)
      enemy.delay = Math.max(500, enemy.delay * (1 - (waveNumber - 1) * 0.05));
    });

    // Scale reward
    config.reward = Math.ceil(config.reward * scalingFactor);
  }

  public startNextWave(): void {
    if (this.isWaveActive) return;

    this.currentWave++;
    this.isWaveActive = true;
    this.currentWaveConfig = this.getWaveConfig(this.currentWave);
    this.currentEnemyIndex = 0;
    this.currentEnemyCount = 0;
    this.spawnTimer = 0;

    // Emit wave start event
    this.scene.events.emit('waveStart', {
      waveNumber: this.currentWave,
      config: this.currentWaveConfig
    });
  }

  public update(delta: number): void {
    if (!this.isWaveActive || !this.currentWaveConfig) return;

    this.spawnTimer += delta;

    const currentEnemy = this.currentWaveConfig.enemies[this.currentEnemyIndex];
    if (currentEnemy && this.spawnTimer >= currentEnemy.delay) {
      this.spawnTimer = 0;
      this.enemySystem.spawnEnemy(currentEnemy.type, currentEnemy.pathIndex);
      this.currentEnemyCount++;

      if (this.currentEnemyCount >= currentEnemy.count) {
        this.currentEnemyIndex++;
        this.currentEnemyCount = 0;
      }

      // Check if wave is complete
      if (this.currentEnemyIndex >= this.currentWaveConfig.enemies.length) {
        this.checkWaveCompletion();
      }
    }
  }

  private checkWaveCompletion(): void {
    if (this.enemySystem.getActiveEnemyCount() === 0) {
      this.completeWave();
    }
  }

  private completeWave(): void {
    if (!this.currentWaveConfig) return;

    this.isWaveActive = false;
    
    // Emit wave complete event with rewards
    this.scene.events.emit('waveComplete', {
      waveNumber: this.currentWave,
      reward: this.currentWaveConfig.reward
    });

    // Check if all waves are complete
    if (this.currentWave >= this.totalWaves) {
      this.scene.events.emit('allWavesComplete');
    }
  }

  public getCurrentWave(): number {
    return this.currentWave;
  }

  public isWaveInProgress(): boolean {
    return this.isWaveActive;
  }

  public setDifficultyMultiplier(multiplier: number): void {
    this.difficultyMultiplier = multiplier;
  }

  public setTotalWaves(waves: number): void {
    this.totalWaves = waves;
  }

  public reset(): void {
    this.currentWave = 0;
    this.isWaveActive = false;
    this.spawnTimer = 0;
    this.currentWaveConfig = null;
    this.currentEnemyIndex = 0;
    this.currentEnemyCount = 0;
    this.difficultyMultiplier = 1;
  }

  public isWaveSetComplete(): boolean {
    return this.currentWave >= this.totalWaves && !this.isWaveActive;
  }
} 