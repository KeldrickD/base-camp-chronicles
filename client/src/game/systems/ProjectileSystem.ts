import Phaser from 'phaser';
import { TurretSystem } from './TurretSystem';

export enum ProjectileType {
  BASIC = 'BASIC',
  LASER = 'LASER',
  MISSILE = 'MISSILE',
  TESLA = 'TESLA'
}

interface StatusEffect {
  type: string;
  chance: number;
  duration: number;
  strength?: number;
  damage?: number;
}

interface Projectile {
  id: string;
  type: ProjectileType;
  sprite: Phaser.GameObjects.Sprite;
  position: Phaser.Math.Vector2;
  target: Phaser.Math.Vector2;
  damage: number;
  speed: number;
  splashRadius?: number;
  chainCount?: number;
  statusEffects?: {
    slow?: StatusEffect;
    burn?: StatusEffect;
    stun?: StatusEffect;
  };
  trail?: Phaser.GameObjects.Graphics;
}

export class ProjectileSystem {
  private scene: Phaser.Scene;
  private turretSystem: TurretSystem;
  private projectiles: Map<string, Projectile> = new Map();

  constructor(scene: Phaser.Scene, turretSystem: TurretSystem) {
    this.scene = scene;
    this.turretSystem = turretSystem;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.scene.events.on('createProjectile', (config: {
      type: ProjectileType;
      position: Phaser.Math.Vector2;
      target: Phaser.Math.Vector2;
      damage: number;
      speed: number;
      splashRadius?: number;
      chainCount?: number;
      statusEffects?: {
        slow?: StatusEffect;
        burn?: StatusEffect;
        stun?: StatusEffect;
      };
    }) => {
      this.createProjectile(config);
    });
  }

  public createProjectile(config: {
    type: ProjectileType;
    position: Phaser.Math.Vector2;
    target: Phaser.Math.Vector2;
    damage: number;
    speed: number;
    splashRadius?: number;
    chainCount?: number;
    statusEffects?: {
      slow?: StatusEffect;
      burn?: StatusEffect;
      stun?: StatusEffect;
    };
  }): void {
    const projectile: Projectile = {
      id: `projectile_${Date.now()}`,
      type: config.type,
      sprite: this.createProjectileSprite(config.type, config.position),
      position: config.position.clone(),
      target: config.target.clone(),
      damage: config.damage,
      speed: config.speed,
      splashRadius: config.splashRadius,
      chainCount: config.chainCount,
      statusEffects: config.statusEffects,
      trail: this.createProjectileTrail(config.type)
    };

    this.projectiles.set(projectile.id, projectile);
  }

  private createProjectileSprite(type: ProjectileType, position: Phaser.Math.Vector2): Phaser.GameObjects.Sprite {
    const sprite = this.scene.add.sprite(position.x, position.y, `projectile-${type.toLowerCase()}`);
    sprite.setScale(0.5);

    // Add glow effect based on projectile type
    const glowColors: Record<ProjectileType, number> = {
      [ProjectileType.BASIC]: 0xffff00,
      [ProjectileType.LASER]: 0xff0000,
      [ProjectileType.MISSILE]: 0xff6600,
      [ProjectileType.TESLA]: 0x00ffff
    };

    const glow = this.scene.add.sprite(position.x, position.y, 'glow');
    glow.setScale(0.3);
    glow.setTint(glowColors[type]);
    glow.setAlpha(0.5);
    sprite.setData('glow', glow);

    return sprite;
  }

  private createProjectileTrail(type: ProjectileType): Phaser.GameObjects.Graphics {
    const graphics = this.scene.add.graphics();
    const trailColors: Record<ProjectileType, number> = {
      [ProjectileType.BASIC]: 0xffff00,
      [ProjectileType.LASER]: 0xff0000,
      [ProjectileType.MISSILE]: 0xff6600,
      [ProjectileType.TESLA]: 0x00ffff
    };
    graphics.lineStyle(2, trailColors[type], 0.5);
    return graphics;
  }

  public update(delta: number): void {
    this.projectiles.forEach((projectile, id) => {
      // Calculate direction to target
      const direction = new Phaser.Math.Vector2(
        projectile.target.x - projectile.position.x,
        projectile.target.y - projectile.position.y
      ).normalize();

      // Update trail
      if (projectile.trail) {
        projectile.trail.beginPath();
        projectile.trail.moveTo(projectile.position.x, projectile.position.y);
      }

      // Move projectile
      projectile.position.x += direction.x * projectile.speed * (delta / 1000);
      projectile.position.y += direction.y * projectile.speed * (delta / 1000);
      projectile.sprite.setPosition(projectile.position.x, projectile.position.y);

      // Update glow position
      const glow = projectile.sprite.getData('glow');
      if (glow) {
        glow.setPosition(projectile.position.x, projectile.position.y);
      }

      // Draw trail
      if (projectile.trail) {
        projectile.trail.lineTo(projectile.position.x, projectile.position.y);
        projectile.trail.strokePath();
      }

      // Check if projectile has reached target
      const distanceToTarget = Phaser.Math.Distance.Between(
        projectile.position.x,
        projectile.position.y,
        projectile.target.x,
        projectile.target.y
      );

      if (distanceToTarget < 5) {
        this.onProjectileHit(projectile);
        this.destroyProjectile(id);
      }
    });
  }

  private onProjectileHit(projectile: Projectile): void {
    // Create hit effect
    this.createHitEffect(projectile);

    interface Enemy {
      id: string;
      sprite: {
        x: number;
        y: number;
      };
    }

    interface NearestEnemy {
      id: string;
      position: Phaser.Math.Vector2;
    }

    // Apply damage and effects to enemies
    this.scene.events.emit('queryEnemies', (enemies: Enemy[]) => {
      if (projectile.splashRadius && projectile.splashRadius > 0) {
        // Area damage
        const radius = projectile.splashRadius; // Cache the value to avoid undefined checks
        enemies.forEach(enemy => {
          const distance = Phaser.Math.Distance.Between(
            projectile.position.x,
            projectile.position.y,
            enemy.sprite.x,
            enemy.sprite.y
          );

          if (distance <= radius) {
            const damageMultiplier = 1 - (distance / radius);
            this.applyDamageAndEffects(enemy.id, projectile, damageMultiplier);
          }
        });
      } else if (projectile.chainCount) {
        // Chain lightning
        let remainingChains = projectile.chainCount;
        let lastPosition = projectile.position.clone();
        const hitEnemies = new Set<string>();

        while (remainingChains > 0) {
          let nearestEnemy: NearestEnemy | null = null;
          let nearestDistance = Infinity;

          for (const enemy of enemies) {
            if (hitEnemies.has(enemy.id)) continue;

            const distance = Phaser.Math.Distance.Between(
              lastPosition.x,
              lastPosition.y,
              enemy.sprite.x,
              enemy.sprite.y
            );

            if (distance < nearestDistance) {
              nearestDistance = distance;
              nearestEnemy = {
                id: enemy.id,
                position: new Phaser.Math.Vector2(enemy.sprite.x, enemy.sprite.y)
              };
            }
          }

          if (nearestEnemy && nearestDistance <= 150) {
            hitEnemies.add(nearestEnemy.id);
            const chainMultiplier = 0.8 ** (projectile.chainCount - remainingChains);
            this.applyDamageAndEffects(nearestEnemy.id, projectile, chainMultiplier);
            this.createChainLightning(lastPosition, nearestEnemy.position);
            lastPosition = nearestEnemy.position;
            remainingChains--;
          } else {
            break;
          }
        }
      } else {
        // Single target damage
        const nearestEnemy = enemies.find(enemy =>
          Phaser.Math.Distance.Between(
            projectile.position.x,
            projectile.position.y,
            enemy.sprite.x,
            enemy.sprite.y
          ) < 20
        );

        if (nearestEnemy) {
          this.applyDamageAndEffects(nearestEnemy.id, projectile, 1);
        }
      }
    });
  }

  private applyDamageAndEffects(enemyId: string, projectile: Projectile, multiplier: number = 1): void {
    // Apply base damage
    this.scene.events.emit('damageEnemy', enemyId, projectile.damage * multiplier);

    // Apply status effects
    if (projectile.statusEffects) {
      Object.entries(projectile.statusEffects).forEach(([type, effect]) => {
        if (Math.random() < effect.chance) {
          this.scene.events.emit('applyStatusEffect', enemyId, {
            type,
            duration: effect.duration,
            strength: effect.strength,
            damage: effect.damage
          });
        }
      });
    }
  }

  private createHitEffect(projectile: Projectile): void {
    const hitColors: Record<ProjectileType, number> = {
      [ProjectileType.BASIC]: 0xffff00,
      [ProjectileType.LASER]: 0xff0000,
      [ProjectileType.MISSILE]: 0xff6600,
      [ProjectileType.TESLA]: 0x00ffff
    };

    // Create particle effect
    const particles = this.scene.add.particles(0, 0, `particle-${projectile.type.toLowerCase()}`, {
      x: projectile.position.x,
      y: projectile.position.y,
      speed: { min: 50, max: 100 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: hitColors[projectile.type],
      lifespan: 300,
      quantity: projectile.splashRadius ? 20 : 10
    });

    // Add shockwave effect for splash damage
    if (projectile.splashRadius) {
      const shockwave = this.scene.add.graphics();
      shockwave.lineStyle(2, hitColors[projectile.type], 0.8);
      shockwave.strokeCircle(projectile.position.x, projectile.position.y, 10);

      this.scene.tweens.add({
        targets: shockwave,
        scaleX: projectile.splashRadius / 10,
        scaleY: projectile.splashRadius / 10,
        alpha: 0,
        duration: 300,
        onComplete: () => shockwave.destroy()
      });
    }

    this.scene.time.delayedCall(300, () => particles.destroy());
  }

  private createChainLightning(from: Phaser.Math.Vector2, to: Phaser.Math.Vector2): void {
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(2, 0x00ffff);
    graphics.beginPath();
    graphics.moveTo(from.x, from.y);

    // Create a jagged line effect
    const distance = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);
    const segments = Math.ceil(distance / 20);
    const direction = new Phaser.Math.Vector2(to.x - from.x, to.y - from.y).normalize();

    for (let i = 1; i <= segments; i++) {
      const progress = i / segments;
      const targetPoint = new Phaser.Math.Vector2(
        from.x + direction.x * distance * progress,
        from.y + direction.y * distance * progress
      );

      // Add some randomness to the middle segments
      if (i > 1 && i < segments) {
        targetPoint.x += (Math.random() - 0.5) * 20;
        targetPoint.y += (Math.random() - 0.5) * 20;
      }

      graphics.lineTo(targetPoint.x, targetPoint.y);
    }

    graphics.strokePath();

    // Fade out and destroy
    this.scene.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: 200,
      onComplete: () => graphics.destroy()
    });
  }

  private destroyProjectile(id: string): void {
    const projectile = this.projectiles.get(id);
    if (projectile) {
      const glow = projectile.sprite.getData('glow');
      if (glow) {
        glow.destroy();
      }
      if (projectile.trail) {
        projectile.trail.destroy();
      }
      projectile.sprite.destroy();
      this.projectiles.delete(id);
    }
  }

  public destroy(): void {
    this.projectiles.forEach(projectile => {
      const glow = projectile.sprite.getData('glow');
      if (glow) {
        glow.destroy();
      }
      if (projectile.trail) {
        projectile.trail.destroy();
      }
      projectile.sprite.destroy();
    });
    this.projectiles.clear();
  }
} 