import Phaser from 'phaser';

export enum EnemyType {
  BASIC = 'basic',
  FAST = 'fast',
  TANK = 'tank',
  SHIELDED = 'shielded',
  BOSS = 'boss'
}

interface EnemyStats {
  health: number;
  speed: number;
  armor: number;
  shield?: number;
  value: number; // Resource reward
  damage: number; // Damage to base
  size: number; // Size multiplier
  abilities?: {
    regeneration?: boolean;
    shieldRecharge?: boolean;
    splitOnDeath?: boolean;
    callReinforcements?: boolean;
  };
}

interface Enemy extends Phaser.GameObjects.Sprite {
  id: string;
  type: EnemyType;
  stats: EnemyStats;
  currentHealth: number;
  currentShield: number;
  path: Phaser.Curves.Path;
  pathProgress: number;
  isActive: boolean;
  statusEffects: Map<string, { duration: number; effect: any }>;
}

export class EnemySystem {
  private scene: Phaser.Scene;
  private enemies: Map<string, Enemy>;
  private paths: Phaser.Curves.Path[];
  private enemyCount: number = 0;
  private defeatedCount: number = 0;

  constructor(scene: Phaser.Scene, paths: Phaser.Curves.Path[]) {
    this.scene = scene;
    this.paths = paths;
    this.enemies = new Map();

    // Initialize enemy textures
    this.createEnemyTextures();
  }

  private createEnemyTextures(): void {
    // Basic enemy (red circle)
    const basicGraphics = this.scene.add.graphics();
    basicGraphics.lineStyle(2, 0xff0000);
    basicGraphics.fillStyle(0xff0000, 0.8);
    basicGraphics.strokeCircle(16, 16, 16);
    basicGraphics.fillCircle(16, 16, 16);
    basicGraphics.generateTexture('enemyBasic', 32, 32);
    basicGraphics.destroy();

    // Fast enemy (yellow triangle)
    const fastGraphics = this.scene.add.graphics();
    fastGraphics.lineStyle(2, 0xffff00);
    fastGraphics.fillStyle(0xffff00, 0.8);
    fastGraphics.beginPath();
    fastGraphics.moveTo(16, 0);
    fastGraphics.lineTo(32, 32);
    fastGraphics.lineTo(0, 32);
    fastGraphics.closePath();
    fastGraphics.strokePath();
    fastGraphics.fillPath();
    fastGraphics.generateTexture('enemyFast', 32, 32);
    fastGraphics.destroy();

    // Tank enemy (blue square)
    const tankGraphics = this.scene.add.graphics();
    tankGraphics.lineStyle(2, 0x0000ff);
    tankGraphics.fillStyle(0x0000ff, 0.8);
    tankGraphics.strokeRect(0, 0, 32, 32);
    tankGraphics.fillRect(0, 0, 32, 32);
    tankGraphics.generateTexture('enemyTank', 32, 32);
    tankGraphics.destroy();

    // Shielded enemy (purple hexagon)
    const shieldedGraphics = this.scene.add.graphics();
    shieldedGraphics.lineStyle(2, 0x800080);
    shieldedGraphics.fillStyle(0x800080, 0.8);
    this.drawHexagon(shieldedGraphics, 16, 16, 16);
    shieldedGraphics.generateTexture('enemyShielded', 32, 32);
    shieldedGraphics.destroy();

    // Boss enemy (large red star)
    const bossGraphics = this.scene.add.graphics();
    bossGraphics.lineStyle(2, 0xff0000);
    bossGraphics.fillStyle(0xff0000, 0.8);
    this.drawStar(bossGraphics, 32, 32, 5, 32, 16);
    bossGraphics.generateTexture('enemyBoss', 64, 64);
    bossGraphics.destroy();
  }

  private drawHexagon(graphics: Phaser.GameObjects.Graphics, x: number, y: number, size: number): void {
    const sides = 6;
    const points: { x: number; y: number }[] = [];
    
    for (let i = 0; i < sides; i++) {
      const angle = (i * Math.PI * 2) / sides;
      points.push({
        x: x + size * Math.cos(angle),
        y: y + size * Math.sin(angle)
      });
    }

    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      graphics.lineTo(points[i].x, points[i].y);
    }
    graphics.closePath();
    graphics.strokePath();
    graphics.fillPath();
  }

  private drawStar(graphics: Phaser.GameObjects.Graphics, x: number, y: number, points: number, outer: number, inner: number): void {
    let angle = Math.PI / 2;
    const step = Math.PI / points;

    graphics.beginPath();
    graphics.moveTo(x + Math.cos(angle) * outer, y - Math.sin(angle) * outer);

    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? inner : outer;
      angle += step;
      graphics.lineTo(x + Math.cos(angle) * radius, y - Math.sin(angle) * radius);
    }

    graphics.closePath();
    graphics.strokePath();
    graphics.fillPath();
  }

  private getEnemyStats(type: EnemyType): EnemyStats {
    switch (type) {
      case EnemyType.BASIC:
        return {
          health: 100,
          speed: 1,
          armor: 0,
          value: 10,
          damage: 10,
          size: 1
        };
      case EnemyType.FAST:
        return {
          health: 60,
          speed: 2,
          armor: 0,
          value: 15,
          damage: 5,
          size: 0.8
        };
      case EnemyType.TANK:
        return {
          health: 300,
          speed: 0.5,
          armor: 5,
          value: 25,
          damage: 20,
          size: 1.2
        };
      case EnemyType.SHIELDED:
        return {
          health: 150,
          speed: 0.8,
          armor: 2,
          shield: 100,
          value: 30,
          damage: 15,
          size: 1,
          abilities: {
            shieldRecharge: true
          }
        };
      case EnemyType.BOSS:
        return {
          health: 1000,
          speed: 0.3,
          armor: 10,
          shield: 500,
          value: 100,
          damage: 50,
          size: 2,
          abilities: {
            regeneration: true,
            shieldRecharge: true,
            callReinforcements: true
          }
        };
      default:
        return {
          health: 100,
          speed: 1,
          armor: 0,
          value: 10,
          damage: 10,
          size: 1
        };
    }
  }

  public spawnEnemy(type: EnemyType, pathIndex: number = 0): Enemy {
    const path = this.paths[pathIndex];
    const startPoint = path.getStartPoint();
    const stats = this.getEnemyStats(type);
    const texture = `enemy${type.charAt(0).toUpperCase() + type.slice(1)}`;

    const enemy = this.scene.add.sprite(startPoint.x, startPoint.y, texture) as Enemy;
    enemy.id = `enemy_${this.enemyCount++}`;
    enemy.type = type;
    enemy.stats = stats;
    enemy.currentHealth = stats.health;
    enemy.currentShield = stats.shield || 0;
    enemy.path = path;
    enemy.pathProgress = 0;
    enemy.isActive = true;
    enemy.statusEffects = new Map();
    enemy.setScale(stats.size);

    // Add shield visual if enemy has shield
    if (stats.shield) {
      const shield = this.scene.add.graphics();
      shield.lineStyle(2, 0x00ffff, 0.8);
      shield.strokeCircle(0, 0, enemy.width * 0.6);
      enemy.add(shield);
    }

    this.enemies.set(enemy.id, enemy);
    return enemy;
  }

  public update(delta: number): void {
    this.enemies.forEach((enemy) => {
      if (!enemy.isActive) return;

      // Update position along path
      const speed = enemy.stats.speed * (delta / 1000);
      enemy.pathProgress += speed;

      if (enemy.pathProgress >= 1) {
        this.handleEnemyReachedEnd(enemy);
        return;
      }

      const position = enemy.path.getPoint(enemy.pathProgress);
      enemy.setPosition(position.x, position.y);

      // Update status effects
      this.updateStatusEffects(enemy, delta);

      // Update abilities
      this.updateAbilities(enemy, delta);
    });
  }

  private updateStatusEffects(enemy: Enemy, delta: number): void {
    enemy.statusEffects.forEach((status, effectId) => {
      status.duration -= delta;
      if (status.duration <= 0) {
        enemy.statusEffects.delete(effectId);
      } else {
        // Apply status effect (e.g., damage over time)
        if (status.effect.damage) {
          this.damageEnemy(enemy, status.effect.damage * (delta / 1000));
        }
        if (status.effect.slow) {
          enemy.stats.speed *= status.effect.slow;
        }
      }
    });
  }

  private updateAbilities(enemy: Enemy, delta: number): void {
    if (!enemy.stats.abilities) return;

    if (enemy.stats.abilities.regeneration) {
      const regenAmount = enemy.stats.health * 0.01 * (delta / 1000);
      enemy.currentHealth = Math.min(enemy.stats.health, enemy.currentHealth + regenAmount);
    }

    if (enemy.stats.abilities.shieldRecharge && enemy.currentShield < enemy.stats.shield!) {
      const rechargeAmount = enemy.stats.shield! * 0.05 * (delta / 1000);
      enemy.currentShield = Math.min(enemy.stats.shield!, enemy.currentShield + rechargeAmount);
    }

    if (enemy.stats.abilities.callReinforcements) {
      // 5% chance per second to call reinforcements
      if (Math.random() < 0.05 * (delta / 1000)) {
        this.spawnEnemy(EnemyType.BASIC);
      }
    }
  }

  public damageEnemy(enemy: Enemy, damage: number): void {
    // Apply damage to shield first if available
    if (enemy.currentShield > 0) {
      const shieldDamage = Math.min(enemy.currentShield, damage);
      enemy.currentShield -= shieldDamage;
      damage -= shieldDamage;
      if (damage <= 0) return;
    }

    // Apply armor reduction
    const effectiveDamage = Math.max(1, damage - enemy.stats.armor);
    enemy.currentHealth -= effectiveDamage;

    // Create damage text
    const damageText = this.scene.add.text(enemy.x, enemy.y - 20, `-${Math.round(effectiveDamage)}`, {
      fontSize: '16px',
      color: '#ff0000'
    });
    this.scene.tweens.add({
      targets: damageText,
      y: damageText.y - 30,
      alpha: 0,
      duration: 1000,
      onComplete: () => damageText.destroy()
    });

    if (enemy.currentHealth <= 0) {
      this.handleEnemyDeath(enemy);
    }
  }

  private handleEnemyDeath(enemy: Enemy): void {
    enemy.isActive = false;
    this.defeatedCount++;

    // Handle split on death
    if (enemy.stats.abilities?.splitOnDeath) {
      const position = enemy.path.getPoint(enemy.pathProgress);
      for (let i = 0; i < 2; i++) {
        const smallEnemy = this.spawnEnemy(EnemyType.FAST);
        smallEnemy.setPosition(position.x, position.y);
        smallEnemy.pathProgress = enemy.pathProgress;
      }
    }

    // Create death effect
    const deathEffect = this.scene.add.particles(0, 0, 'particle', {
      x: enemy.x,
      y: enemy.y,
      speed: { min: 50, max: 100 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      lifespan: 1000,
      quantity: 20
    });

    // Clean up after death effect
    this.scene.time.delayedCall(1000, () => {
      deathEffect.destroy();
      enemy.destroy();
      this.enemies.delete(enemy.id);
    });

    // Emit event for resource reward
    this.scene.events.emit('enemyDefeated', enemy.stats.value);
  }

  private handleEnemyReachedEnd(enemy: Enemy): void {
    this.scene.events.emit('enemyReachedEnd', enemy.stats.damage);
    enemy.isActive = false;
    enemy.destroy();
    this.enemies.delete(enemy.id);
  }

  public getActiveEnemies(): Enemy[] {
    return Array.from(this.enemies.values()).filter(enemy => enemy.isActive);
  }

  public getActiveEnemyCount(): number {
    return this.getActiveEnemies().length;
  }

  public getDefeatedCount(): number {
    return this.defeatedCount;
  }

  public clear(): void {
    this.enemies.forEach(enemy => enemy.destroy());
    this.enemies.clear();
    this.enemyCount = 0;
    this.defeatedCount = 0;
  }
} 