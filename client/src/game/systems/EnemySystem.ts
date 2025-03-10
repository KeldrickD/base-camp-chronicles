import Phaser from 'phaser';

export type DamageType = 'basic' | 'laser' | 'missile' | 'tesla' | 'burn';

export interface EnemyStats {
  health: number;
  maxHealth: number;
  speed: number;
  armor: number;
  value: number;
  resistances?: {
    basic?: number;
    laser?: number;
    missile?: number;
    tesla?: number;
  };
}

export interface Enemy {
  id: string;
  type: string;
  sprite: Phaser.GameObjects.Sprite;
  healthBar: Phaser.GameObjects.Graphics;
  stats: EnemyStats;
  path: Phaser.Curves.Path;
  pathProgress: number;
  statusEffects: Map<string, {
    type: 'slow' | 'burn' | 'stun';
    duration: number;
    strength?: number;
    damage?: number;
    lastTick?: number;
  }>;
}

export class EnemySystem {
  private enemies: Map<string, Enemy> = new Map();
  private scene: Phaser.Scene;
  private defeatedCount: number = 0;
  private paths: Phaser.Curves.Path[] = [];

  constructor(scene: Phaser.Scene, paths: Phaser.Curves.Path[] = []) {
    this.scene = scene;
    this.paths = paths;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Handle enemy queries
    this.scene.events.on('queryEnemies', (callback: (enemies: Enemy[]) => void) => {
      callback(Array.from(this.enemies.values()));
    });

    // Handle path queries
    this.scene.events.on('checkPath', (position: { x: number; y: number }, callback: (onPath: boolean) => void) => {
      callback(this.isPositionOnPath(position));
    });
  }

  public addPath(path: Phaser.Curves.Path): void {
    this.paths.push(path);
  }

  private isPositionOnPath(position: { x: number; y: number }): boolean {
    const threshold = 32; // Distance threshold for path collision

    return this.paths.some(path => {
      const points = path.getPoints(50);
      return points.some(point => 
        Phaser.Math.Distance.Between(position.x, position.y, point.x, point.y) < threshold
      );
    });
  }

  public spawnEnemy(type: string, pathIndex: number = 0): void {
    if (pathIndex >= this.paths.length) return;

    const stats = this.getEnemyStats(type);
    const path = this.paths[pathIndex];
    const startPoint = path.getStartPoint();

    // Create enemy sprite
    const sprite = this.scene.add.sprite(startPoint.x, startPoint.y, `enemy-${type}`);
    sprite.setDepth(1);

    // Create health bar
    const healthBar = this.scene.add.graphics();
    this.updateHealthBar(healthBar, startPoint.x, startPoint.y, stats.health / stats.maxHealth);

    const enemy: Enemy = {
      id: `enemy_${Date.now()}`,
      type,
      sprite,
      healthBar,
      stats,
      path,
      pathProgress: 0,
      statusEffects: new Map()
    };

    this.enemies.set(enemy.id, enemy);
  }

  private getEnemyStats(type: string): EnemyStats {
    switch (type) {
      case 'scout':
        return {
          health: 50,
          maxHealth: 50,
          speed: 100,
          armor: 0,
          value: 10
        };
      case 'tank':
        return {
          health: 200,
          maxHealth: 200,
          speed: 50,
          armor: 5,
          value: 25,
          resistances: {
            basic: 0.5,
            missile: 0.3
          }
        };
      case 'speeder':
        return {
          health: 75,
          maxHealth: 75,
          speed: 150,
          armor: 0,
          value: 15,
          resistances: {
            tesla: 0.3
          }
        };
      case 'shielded':
        return {
          health: 150,
          maxHealth: 150,
          speed: 75,
          armor: 3,
          value: 20,
          resistances: {
            laser: 0.5
          }
        };
      case 'swarm':
        return {
          health: 30,
          maxHealth: 30,
          speed: 120,
          armor: 0,
          value: 5
        };
      default:
        return {
          health: 100,
          maxHealth: 100,
          speed: 75,
          armor: 0,
          value: 10
        };
    }
  }

  private updateHealthBar(
    healthBar: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    percentage: number
  ): void {
    healthBar.clear();

    // Background
    healthBar.fillStyle(0x000000, 0.8);
    healthBar.fillRect(x - 20, y - 25, 40, 5);

    // Health
    const color = percentage > 0.6 ? 0x00ff00 : percentage > 0.3 ? 0xff9900 : 0xff0000;
    healthBar.fillStyle(color, 1);
    healthBar.fillRect(x - 20, y - 25, 40 * percentage, 5);
  }

  public update(delta: number): void {
    this.enemies.forEach(enemy => enemy.update(delta));
  }

  public getDefeatedCount(): number {
    return this.defeatedCount;
  }

  public getActiveEnemyCount(): number {
    return this.enemies.size;
  }

  private onEnemyDefeated(enemy: Enemy): void {
    this.defeatedCount++;
    this.enemies.delete(enemy.id);
    this.scene.events.emit('enemyDefeated', enemy);
  }

  public destroy(): void {
    this.enemies.forEach(enemy => {
      enemy.sprite.destroy();
      enemy.healthBar.destroy();
    });
    this.enemies.clear();
    this.paths = [];
  }
} 