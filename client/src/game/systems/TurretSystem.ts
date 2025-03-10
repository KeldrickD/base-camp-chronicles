import Phaser from 'phaser';
import { ProjectileType } from './ProjectileSystem';

interface TurretStats {
  maxHealth: number;
  health: number;
  defense: number;
  attackDamage: number;
  attackSpeed: number;
  attackRange: number;
  splashRadius?: number;
  statusEffects?: {
    slow?: { chance: number; duration: number; strength: number };
    burn?: { chance: number; duration: number; damage: number };
    stun?: { chance: number; duration: number };
  };
  specialAbility?: {
    type: 'rapidFire' | 'piercing' | 'multishot' | 'overcharge';
    cooldown: number;
    duration?: number;
    lastUsed?: number;
    isActive?: boolean;
  };
}

interface Turret {
  id: string;
  sprite: Phaser.GameObjects.Sprite;
  stats: TurretStats;
  position: Phaser.Math.Vector2;
  range: number;
  rangeGraphics?: Phaser.GameObjects.Graphics;
  target?: {
    id: string;
    position: Phaser.Math.Vector2;
  };
  lastFired?: number;
  energyField?: Phaser.GameObjects.Graphics;
  chargeLevel?: number;
}

export class TurretSystem {
  private scene: Phaser.Scene;
  private turrets: Map<string, Turret> = new Map();
  private showRanges: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Toggle range indicators on key press
    this.scene.input.keyboard?.on('keydown-R', () => {
      this.toggleRangeIndicators();
    });

    // Handle enemy queries
    this.scene.events.on('queryTurrets', (callback: (turrets: Turret[]) => void) => {
      callback(Array.from(this.turrets.values()));
    });
  }

  public registerTurret(config: {
    id: string;
    sprite: Phaser.GameObjects.Sprite;
    stats: TurretStats;
    position: Phaser.Math.Vector2;
    range: number;
  }): void {
    const turret: Turret = {
      ...config,
      rangeGraphics: this.createRangeIndicator(config.position, config.range),
      chargeLevel: config.stats.specialAbility?.type === 'overcharge' ? 0 : undefined
    };

    if (config.stats.specialAbility?.type === 'overcharge') {
      turret.energyField = this.createEnergyField(config.position);
    }

    this.turrets.set(turret.id, turret);
    this.updateRangeVisibility(turret);
  }

  public unregisterTurret(id: string): void {
    const turret = this.turrets.get(id);
    if (turret) {
      if (turret.rangeGraphics) {
        turret.rangeGraphics.destroy();
      }
      this.turrets.delete(id);
    }
  }

  private createRangeIndicator(position: Phaser.Math.Vector2, range: number): Phaser.GameObjects.Graphics {
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(2, 0x00ff00, 0.3);
    graphics.strokeCircle(position.x, position.y, range);
    return graphics;
  }

  private createEnergyField(position: Phaser.Math.Vector2): Phaser.GameObjects.Graphics {
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(2, 0x00ffff, 0.5);
    graphics.strokeCircle(position.x, position.y, 30);
    graphics.setAlpha(0);
    return graphics;
  }

  private toggleRangeIndicators(): void {
    this.showRanges = !this.showRanges;
    this.turrets.forEach(turret => this.updateRangeVisibility(turret));
  }

  private updateRangeVisibility(turret: Turret): void {
    if (turret.rangeGraphics) {
      turret.rangeGraphics.setVisible(this.showRanges);
    }
  }

  public update(time: number): void {
    this.turrets.forEach(turret => {
      // Update special abilities
      this.updateSpecialAbility(turret, time);

      // Find target if none exists or previous target is invalid
      if (!turret.target) {
        turret.target = this.findTarget(turret);
      }

      if (turret.target) {
        // Update turret rotation to face target
        const angle = Phaser.Math.Angle.Between(
          turret.position.x,
          turret.position.y,
          turret.target.position.x,
          turret.target.position.y
        );
        turret.sprite.setRotation(angle);

        // Check if target is still in range
        const distance = Phaser.Math.Distance.Between(
          turret.position.x,
          turret.position.y,
          turret.target.position.x,
          turret.target.position.y
        );

        if (distance > turret.range) {
          turret.target = undefined;
          return;
        }

        // Fire at target if ready
        const fireDelay = turret.stats.specialAbility?.isActive && 
                         turret.stats.specialAbility.type === 'rapidFire' 
                         ? 500 
                         : 1000;
        if (!turret.lastFired || time - turret.lastFired >= fireDelay / turret.stats.attackSpeed) {
          this.fireAtTarget(turret, time);
        }
      }

      // Update visual effects
      this.updateVisualEffects(turret);
    });
  }

  private updateSpecialAbility(turret: Turret, time: number): void {
    const ability = turret.stats.specialAbility;
    if (!ability) return;

    // Check if ability should be deactivated
    if (ability.isActive && ability.duration && ability.lastUsed) {
      if (time - ability.lastUsed >= ability.duration) {
        ability.isActive = false;
      }
    }

    // Handle overcharge mechanic
    if (ability.type === 'overcharge' && turret.chargeLevel !== undefined) {
      if (turret.target) {
        turret.chargeLevel = Math.min(100, turret.chargeLevel + 0.1);
      } else {
        turret.chargeLevel = Math.max(0, turret.chargeLevel - 0.2);
      }
    }

    // Activate ability if ready
    if (!ability.isActive && ability.lastUsed && time - ability.lastUsed >= ability.cooldown) {
      this.activateSpecialAbility(turret, time);
    }
  }

  private activateSpecialAbility(turret: Turret, time: number): void {
    const ability = turret.stats.specialAbility;
    if (!ability) return;

    ability.isActive = true;
    ability.lastUsed = time;

    // Create activation effect
    const particles = this.scene.add.particles(0, 0, 'particle', {
      x: turret.position.x,
      y: turret.position.y,
      speed: { min: 50, max: 100 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: 0x00ff00,
      lifespan: 500,
      quantity: 20
    });

    this.scene.time.delayedCall(500, () => particles.destroy());
  }

  private updateVisualEffects(turret: Turret): void {
    // Update energy field for Tesla turrets
    if (turret.energyField && turret.chargeLevel !== undefined) {
      turret.energyField.clear();
      turret.energyField.lineStyle(2, 0x00ffff, 0.5);
      turret.energyField.strokeCircle(turret.position.x, turret.position.y, 30);
      turret.energyField.setAlpha(turret.chargeLevel / 100);

      if (turret.chargeLevel >= 100) {
        // Add pulsing effect
        this.scene.tweens.add({
          targets: turret.energyField,
          alpha: { from: 1, to: 0.5 },
          duration: 1000,
          yoyo: true,
          repeat: -1
        });
      }
    }
  }

  private findTarget(turret: Turret): { id: string; position: Phaser.Math.Vector2 } | undefined {
    let nearestEnemy: { id: string; position: Phaser.Math.Vector2 } | undefined;
    let nearestDistance = Infinity;

    this.scene.events.emit('queryEnemies', (enemies: { id: string; sprite: { x: number; y: number } }[]) => {
      enemies.forEach(enemy => {
        const distance = Phaser.Math.Distance.Between(
          turret.position.x,
          turret.position.y,
          enemy.sprite.x,
          enemy.sprite.y
        );

        if (distance <= turret.range && distance < nearestDistance) {
          nearestDistance = distance;
          nearestEnemy = {
            id: enemy.id,
            position: new Phaser.Math.Vector2(enemy.sprite.x, enemy.sprite.y)
          };
        }
      });
    });

    return nearestEnemy;
  }

  private fireAtTarget(turret: Turret, time: number): void {
    if (!turret.target) return;

    // Determine projectile type and configuration based on turret stats and special abilities
    const initialProjectileType = ProjectileType.BASIC;
    
    interface ProjectileConfig {
      type: ProjectileType;
      position: Phaser.Math.Vector2;
      target: Phaser.Math.Vector2;
      damage: number;
      speed: number;
      splashRadius?: number;
      chainCount?: number;
      piercing?: boolean;
      statusEffects?: TurretStats['statusEffects'];
    }

    const projectileConfig: ProjectileConfig = {
      type: initialProjectileType,
      position: turret.position.clone(),
      target: turret.target.position.clone(),
      damage: turret.stats.attackDamage,
      speed: 300,
      statusEffects: turret.stats.statusEffects
    };

    if (turret.stats.statusEffects?.burn) {
      projectileConfig.type = ProjectileType.LASER;
    } else if (turret.stats.splashRadius) {
      projectileConfig.type = ProjectileType.MISSILE;
      projectileConfig.splashRadius = turret.stats.splashRadius;
    } else if (turret.stats.statusEffects?.stun) {
      projectileConfig.type = ProjectileType.TESLA;
      projectileConfig.chainCount = turret.chargeLevel && turret.chargeLevel >= 100 ? 5 : 3;
      if (turret.chargeLevel) turret.chargeLevel = 0; // Reset charge after powerful shot
    }

    // Handle special abilities
    if (turret.stats.specialAbility?.isActive) {
      switch (turret.stats.specialAbility.type) {
        case 'multishot':
          // Fire in a spread pattern
          for (let i = -1; i <= 1; i++) {
            const angle = Phaser.Math.Angle.Between(
              turret.position.x,
              turret.position.y,
              turret.target.position.x,
              turret.target.position.y
            ) + (i * Math.PI / 8);

            const targetPos = new Phaser.Math.Vector2(
              turret.position.x + Math.cos(angle) * 200,
              turret.position.y + Math.sin(angle) * 200
            );

            this.scene.events.emit('createProjectile', {
              ...projectileConfig,
              target: targetPos
            });
          }
          break;

        case 'piercing':
          this.scene.events.emit('createProjectile', {
            ...projectileConfig,
            piercing: true
          });
          break;

        default:
          this.scene.events.emit('createProjectile', projectileConfig);
      }
    } else {
      this.scene.events.emit('createProjectile', projectileConfig);
    }

    // Update last fired time
    turret.lastFired = time;

    // Play appropriate sound effect
    const soundEffects: Record<ProjectileType, string> = {
      [ProjectileType.BASIC]: 'turret-fire',
      [ProjectileType.LASER]: 'laser-fire',
      [ProjectileType.MISSILE]: 'missile-fire',
      [ProjectileType.TESLA]: 'tesla-fire'
    };

    this.scene.sound.play(soundEffects[projectileConfig.type], { volume: 0.3 });

    // Create muzzle flash effect
    this.createMuzzleFlash(turret, projectileConfig.type);
  }

  private createMuzzleFlash(turret: Turret, projectileType: ProjectileType): void {
    const muzzleColors: Record<ProjectileType, number> = {
      [ProjectileType.BASIC]: 0xffff00,
      [ProjectileType.LASER]: 0xff0000,
      [ProjectileType.MISSILE]: 0xff6600,
      [ProjectileType.TESLA]: 0x00ffff
    };

    const particles = this.scene.add.particles(0, 0, 'particle', {
      x: turret.position.x,
      y: turret.position.y,
      speed: { min: 50, max: 100 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: muzzleColors[projectileType],
      lifespan: 200,
      quantity: 5
    });

    this.scene.time.delayedCall(200, () => particles.destroy());
  }

  public getTurret(id: string): Turret | undefined {
    return this.turrets.get(id);
  }

  public destroy(): void {
    this.turrets.forEach(turret => {
      if (turret.rangeGraphics) {
        turret.rangeGraphics.destroy();
      }
    });
    this.turrets.clear();
  }

  public activateAbility(turretId: string): void {
    const turret = this.turrets.get(turretId);
    if (!turret || !turret.stats.specialAbility) return;

    const ability = turret.stats.specialAbility;
    const time = this.scene.time.now;

    // Check if ability is ready
    if (ability.lastUsed && time - ability.lastUsed < ability.cooldown) {
      return; // Still on cooldown
    }

    // Activate ability
    ability.isActive = true;
    ability.lastUsed = time;

    // Create activation effect
    const particles = this.scene.add.particles(0, 0, 'particle', {
      x: turret.position.x,
      y: turret.position.y,
      speed: { min: 50, max: 100 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: 0x00ff00,
      lifespan: 500,
      quantity: 20
    });

    // Play activation sound
    const soundEffects: Record<string, string> = {
      'rapidFire': 'ability-rapid-fire',
      'piercing': 'ability-piercing',
      'multishot': 'ability-multishot',
      'overcharge': 'ability-overcharge'
    };
    this.scene.sound.play(soundEffects[ability.type], { volume: 0.4 });

    // Handle specific ability effects
    switch (ability.type) {
      case 'overcharge':
        if (turret.chargeLevel !== undefined) {
          turret.chargeLevel = 100; // Instantly charge to max
        }
        break;
      case 'rapidFire':
        // Effect is handled in update method
        break;
      case 'piercing':
        // Effect is handled in projectile creation
        break;
      case 'multishot':
        // Effect is handled in projectile creation
        break;
    }

    this.scene.time.delayedCall(500, () => particles.destroy());

    // If ability has duration, schedule deactivation
    if (ability.duration) {
      this.scene.time.delayedCall(ability.duration, () => {
        ability.isActive = false;
      });
    }
  }
} 