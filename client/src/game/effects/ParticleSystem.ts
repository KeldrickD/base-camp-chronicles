import Phaser from 'phaser';

export enum ParticleEffectType {
  ENEMY_DEATH = 'enemyDeath',
  RESOURCE_COLLECT = 'resourceCollect',
  ABILITY_ACTIVATE = 'abilityActivate',
  PROJECTILE_IMPACT = 'projectileImpact',
  SHIELD_BREAK = 'shieldBreak',
  HEAL = 'heal',
  RAPID_FIRE = 'rapidFire',
  PIERCING = 'piercing',
  MULTISHOT = 'multishot',
  OVERCHARGE = 'overcharge',
  TESLA_CHAIN = 'teslaChain'
}

type EmitZoneType = 'random' | 'edge';
type EmitZoneSource = Phaser.Geom.Circle | Phaser.Geom.Rectangle;

interface ParticleEmitZone {
  type: EmitZoneType;
  source: EmitZoneSource;
  quantity: number;
}

interface ParticleConfig extends Omit<Phaser.Types.GameObjects.Particles.ParticleEmitterConfig, 'emitZone'> {
  texture: string;
  frame?: string | number;
  emitZone?: ParticleEmitZone;
}

export class ParticleSystem {
  private scene: Phaser.Scene;
  private particleConfigs: Map<ParticleEffectType, ParticleConfig>;
  private activeEmitters: Map<string, {
    emitter: Phaser.GameObjects.Particles.ParticleEmitter;
    manager: Phaser.GameObjects.Particles.ParticleEmitterManager;
  }>;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.particleConfigs = new Map();
    this.activeEmitters = new Map();
    this.initializeParticleConfigs();
  }

  private convertEmitZone(zone?: ParticleEmitZone): Phaser.Types.GameObjects.Particles.EmitZoneData | undefined {
    if (!zone) return undefined;
    return {
      type: zone.type,
      source: zone.source,
      quantity: zone.quantity
    };
  }

  private initializeParticleConfigs(): void {
    // Enemy death effect
    this.particleConfigs.set(ParticleEffectType.ENEMY_DEATH, {
      texture: 'particle',
      lifespan: 1000,
      speed: { min: 50, max: 100 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      quantity: 20,
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Circle(0, 0, 20),
        quantity: 20
      }
    });

    // Resource collection effect
    this.particleConfigs.set(ParticleEffectType.RESOURCE_COLLECT, {
      texture: 'resource-particle',
      lifespan: 800,
      speed: { min: 30, max: 60 },
      scale: { start: 0.3, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      quantity: 10,
      angle: { min: -30, max: 30 },
      gravityY: -100
    });

    // Ability activation effect
    this.particleConfigs.set(ParticleEffectType.ABILITY_ACTIVATE, {
      texture: 'ability-particle',
      lifespan: 1200,
      speed: { min: 20, max: 40 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      quantity: 15,
      emitZone: {
        type: 'edge',
        source: new Phaser.Geom.Circle(0, 0, 30),
        quantity: 15
      }
    });

    // Projectile impact effect
    this.particleConfigs.set(ParticleEffectType.PROJECTILE_IMPACT, {
      texture: 'impact-particle',
      lifespan: 600,
      speed: { min: 40, max: 80 },
      scale: { start: 0.3, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      quantity: 8,
      angle: { min: 0, max: 360 }
    });

    // Shield break effect
    this.particleConfigs.set(ParticleEffectType.SHIELD_BREAK, {
      texture: 'shield-particle',
      lifespan: 1500,
      speed: { min: 60, max: 120 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      quantity: 25,
      emitZone: {
        type: 'edge',
        source: new Phaser.Geom.Circle(0, 0, 40)
      }
    });

    // Heal effect
    this.particleConfigs.set(ParticleEffectType.HEAL, {
      texture: 'heal-particle',
      lifespan: 1000,
      speed: { min: 20, max: 40 },
      scale: { start: 0.3, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: 0x00ff00,
      blendMode: Phaser.BlendModes.ADD,
      quantity: 12,
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Rectangle(-15, -15, 30, 30)
      }
    });

    // RapidFire effect
    this.particleConfigs.set(ParticleEffectType.RAPID_FIRE, {
      texture: 'ability-particle',
      lifespan: 600,
      speed: { min: 50, max: 100 },
      scale: { start: 0.3, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: 0xffff00,
      blendMode: Phaser.BlendModes.ADD,
      quantity: 5,
      frequency: 50,
      emitZone: {
        type: 'edge',
        source: new Phaser.Geom.Circle(0, 0, 20),
        quantity: 20
      }
    });

    // Piercing effect
    this.particleConfigs.set(ParticleEffectType.PIERCING, {
      texture: 'ability-particle',
      lifespan: 800,
      speed: { min: 30, max: 60 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: 0xff0000,
      blendMode: Phaser.BlendModes.ADD,
      quantity: 8,
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Rectangle(-10, -10, 20, 20)
      }
    });

    // Multishot effect
    this.particleConfigs.set(ParticleEffectType.MULTISHOT, {
      texture: 'ability-particle',
      lifespan: 1000,
      speed: { min: 40, max: 80 },
      scale: { start: 0.3, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: 0x00ffff,
      blendMode: Phaser.BlendModes.ADD,
      quantity: 12,
      angle: { min: -45, max: 45 }
    });

    // Overcharge effect
    this.particleConfigs.set(ParticleEffectType.OVERCHARGE, {
      texture: 'ability-particle',
      lifespan: 1500,
      speed: { min: 20, max: 40 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: 0xff00ff,
      blendMode: Phaser.BlendModes.ADD,
      quantity: 15,
      emitZone: {
        type: 'edge',
        source: new Phaser.Geom.Circle(0, 0, 30)
      }
    });

    // Tesla chain effect
    this.particleConfigs.set(ParticleEffectType.TESLA_CHAIN, {
      texture: 'ability-particle',
      lifespan: 400,
      speed: { min: 60, max: 120 },
      scale: { start: 0.2, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: 0x00ffff,
      blendMode: Phaser.BlendModes.ADD,
      quantity: 10,
      frequency: 30
    });
  }

  public createEffect(
    type: ParticleEffectType,
    x: number,
    y: number,
    customConfig?: Partial<ParticleConfig>
  ): void {
    const baseConfig = this.particleConfigs.get(type);
    if (!baseConfig) return;

    const config = { ...baseConfig, ...customConfig };
    const manager = this.scene.add.particles(0, 0, config.texture);
    manager.setPosition(x, y);

    const emitterConfig: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
      ...config,
      emitZone: this.convertEmitZone(config.emitZone)
    };

    const emitter = manager.createEmitter(emitterConfig);
    const emitterId = `${type}_${Date.now()}`;
    this.activeEmitters.set(emitterId, { emitter, manager });

    if (typeof config.lifespan === 'number') {
      this.scene.time.delayedCall(config.lifespan, () => {
        const active = this.activeEmitters.get(emitterId);
        if (active) {
          active.emitter.stop();
          active.manager.destroy();
          this.activeEmitters.delete(emitterId);
        }
      });
    }
  }

  public createTrail(
    gameObject: Phaser.GameObjects.GameObject & { x: number; y: number },
    type: ParticleEffectType,
    customConfig?: Partial<ParticleConfig>
  ): Phaser.GameObjects.Particles.ParticleEmitter {
    const baseConfig = this.particleConfigs.get(type);
    if (!baseConfig) {
      throw new Error(`Invalid particle effect type: ${type}`);
    }

    const config = { ...baseConfig, ...customConfig };
    const manager = this.scene.add.particles(0, 0, config.texture);

    const emitterConfig: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
      ...config,
      follow: gameObject,
      frequency: config.frequency || 50,
      quantity: config.quantity || 1,
      emitZone: this.convertEmitZone(config.emitZone)
    };

    const emitter = manager.createEmitter(emitterConfig);
    const emitterId = `trail_${Date.now()}`;
    this.activeEmitters.set(emitterId, { emitter, manager });

    return emitter;
  }

  public stopTrail(emitter: Phaser.GameObjects.Particles.ParticleEmitter): void {
    emitter.stop();
    
    // Find and remove the emitter from active emitters
    for (const [id, active] of this.activeEmitters.entries()) {
      if (active.emitter === emitter) {
        this.scene.time.delayedCall(1000, () => {
          active.manager.destroy();
          this.activeEmitters.delete(id);
        });
        break;
      }
    }
  }

  public createExplosion(
    x: number,
    y: number,
    radius: number,
    color: number = 0xff0000
  ): void {
    const manager = this.scene.add.particles(0, 0, 'particle');
    manager.setPosition(x, y);

    const emitter = manager.createEmitter({
      speed: { min: 100, max: 200 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 800,
      quantity: 30,
      tint: color,
      blendMode: Phaser.BlendModes.ADD,
      emitZone: {
        type: 'edge',
        source: new Phaser.Geom.Circle(0, 0, radius),
        quantity: 30
      }
    });

    emitter.start();
    
    this.scene.time.delayedCall(16, () => {
      emitter.stop();
    });

    this.scene.time.delayedCall(1000, () => {
      manager.destroy();
    });
  }

  public update(): void {
    // Update any active effects that need it
    this.activeEmitters.forEach(({ emitter }) => {
      // Add any necessary updates for specific effect types
    });
  }

  public clear(): void {
    this.activeEmitters.forEach(({ emitter, manager }) => {
      emitter.stop();
      manager.destroy();
    });
    this.activeEmitters.clear();
  }
} 