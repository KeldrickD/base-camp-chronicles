import Phaser from 'phaser';
import { DestructionEffect } from '../effects/DestructionEffect';
import { AchievementStorage } from './AchievementStorage';
import { AchievementRewards } from './AchievementRewards';
import { RewardCombinations } from './RewardCombinations';
import { AchievementEffects } from './AchievementEffects';
import { AchievementStats } from './AchievementStats';
import { AchievementChallenges } from './AchievementChallenges';

export interface StatusEffect {
  type: 'slow' | 'burn' | 'stun';
  duration: number;
  strength: number;
  startTime: number;
  lastTick?: number;
}

interface StatusCombo {
  effects: string[];
  onApply: (target: Damageable) => void;
  onTick?: (target: Damageable, currentTime: number) => void;
  description: string;
}

export interface CombatStats {
  maxHealth: number;
  health: number;
  defense: number;
  attackDamage?: number;
  attackRange?: number;
  attackSpeed?: number;
  splashRadius?: number;
  statusEffects?: {
    slow?: { chance: number; duration: number; strength: number };
    burn?: { chance: number; duration: number; damage: number };
    stun?: { chance: number; duration: number };
  };
}

export interface Damageable {
  stats: CombatStats;
  sprite: Phaser.GameObjects.Sprite;
  healthBar?: Phaser.GameObjects.Graphics;
  activeEffects?: Map<string, StatusEffect>;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  requirement: number;
  progress: number;
  achieved: boolean;
  icon: string;
  tier?: 'bronze' | 'silver' | 'gold';
  nextTier?: string; // ID of the next tier achievement
}

interface ComboAchievementData {
  totalTriggered: number;
  lastTriggerTime?: number;
  chainCount: number;
}

class CombatSystem {
  private static instance: CombatSystem;
  private entities: Map<string, Damageable> = new Map();
  private scene?: Phaser.Scene;
  private effects?: DestructionEffect;
  private effectIndicators: Map<string, Phaser.GameObjects.Container> = new Map();
  private lastComboCheck: Map<string, number> = new Map();
  private achievements: Map<string, Achievement> = new Map();
  private comboStats: Map<string, ComboAchievementData> = new Map();
  private achievementStorage: AchievementStorage;
  private achievementRewards: AchievementRewards;
  private rewardCombinations: RewardCombinations;
  private frozenDamageMultiplier: number = 1.0;
  private statusSpreadRadius: number = 0;
  private globalEffectMultiplier: number = 1.0;
  private achievementEffects: AchievementEffects;
  private achievementStats: AchievementStats;
  private achievementChallenges: AchievementChallenges;

  // Add reward multipliers
  private brittleMultiplier: number = 1.5;  // Base 50% increase
  private explosionRadiusMultiplier: number = 1.0;
  private frozenDurationMultiplier: number = 1.5;  // Base 50% increase
  private supernovaWaves: number = 3;
  private comboDurationMultiplier: number = 1.0;

  private readonly COMBO_CHECK_INTERVAL = 100; // Check combos every 100ms
  private readonly COMBO_CHAIN_WINDOW = 5000; // 5 seconds window for chain achievements

  private readonly statusCombos: StatusCombo[] = [
    {
      // Burn + Slow = Brittle (increased damage taken)
      effects: ['burn', 'slow'],
      description: 'Brittle: 50% more burn damage',
      onApply: (target) => {
        if (!target.activeEffects) return;
        const burnEffect = Array.from(target.activeEffects.values())
          .find(effect => effect.type === 'burn');
        if (burnEffect) {
          burnEffect.strength *= 1.5; // 50% more burn damage
        }
      }
    },
    {
      // Burn + Stun = Explosion (AoE damage)
      effects: ['burn', 'stun'],
      description: 'Explosion: AoE damage burst',
      onApply: (target) => {
        if (!this.scene || !target.activeEffects) return;
        
        // Create explosion effect
        const explosion = this.scene.add.circle(
          target.sprite.x,
          target.sprite.y,
          50,
          0xff4400,
          0.5
        );
        
        this.scene.tweens.add({
          targets: explosion,
          alpha: 0,
          scale: 1.5,
          duration: 300,
          onComplete: () => explosion.destroy()
        });

        // Deal AoE damage
        const explosionDamage = 20;
        const explosionRadius = 50;
        
        this.entities.forEach((entity, id) => {
          if (id === target.sprite.getData('entityId')) return;
          
          const distance = Phaser.Math.Distance.Between(
            target.sprite.x,
            target.sprite.y,
            entity.sprite.x,
            entity.sprite.y
          );

          if (distance <= explosionRadius) {
            const damageMultiplier = 1 - (distance / explosionRadius);
            const damage = Math.floor(explosionDamage * damageMultiplier);
            this.damage(id, damage, true);
          }
        });
      }
    },
    {
      // Slow + Stun = Frozen (extended duration)
      effects: ['slow', 'stun'],
      description: 'Frozen: 50% longer effect duration',
      onApply: (target) => {
        if (!target.activeEffects) return;
        
        // Extend duration of both effects
        target.activeEffects.forEach(effect => {
          if (effect.type === 'slow' || effect.type === 'stun') {
            effect.duration *= 1.5; // 50% longer duration
          }
        });
      }
    },
    {
      // Triple Combo: Burn + Slow + Stun = Supernova
      effects: ['burn', 'slow', 'stun'],
      description: 'Supernova: Massive AoE damage and chain reaction',
      onApply: (target) => {
        if (!this.scene || !target.activeEffects) return;

        // Create supernova visual effect
        const radius = 100;
        const duration = 500;
        
        // Core explosion
        const core = this.scene.add.circle(
          target.sprite.x,
          target.sprite.y,
          radius * 0.3,
          0xffffff,
          1
        );

        // Outer ring
        const ring = this.scene.add.circle(
          target.sprite.x,
          target.sprite.y,
          radius,
          0xff8800,
          0.6
        );

        // Animate core
        this.scene.tweens.add({
          targets: core,
          alpha: 0,
          scale: 2,
          duration: duration * 0.5,
          onComplete: () => core.destroy()
        });

        // Animate ring
        this.scene.tweens.add({
          targets: ring,
          alpha: 0,
          scale: 1.5,
          duration: duration,
          onComplete: () => ring.destroy()
        });

        // Deal massive damage in multiple waves
        const waves = 3;
        const baseDamage = 50;
        const waveInterval = duration / waves;

        for (let i = 0; i < waves; i++) {
          this.scene.time.delayedCall(i * waveInterval, () => {
            const waveRadius = radius * (1 + i * 0.3);
            const waveDamage = baseDamage * (1 - i * 0.2);

            // Create wave effect
            const wave = this.scene.add.circle(
              target.sprite.x,
              target.sprite.y,
              waveRadius,
              0xff4400,
              0.3
            );

            this.scene.tweens.add({
              targets: wave,
              alpha: 0,
              scale: 1.2,
              duration: waveInterval,
              onComplete: () => wave.destroy()
            });

            // Deal damage and apply effects to caught entities
            this.entities.forEach((entity, id) => {
              if (id === target.sprite.getData('entityId')) return;

              const distance = Phaser.Math.Distance.Between(
                target.sprite.x,
                target.sprite.y,
                entity.sprite.x,
                entity.sprite.y
              );

              if (distance <= waveRadius) {
                const damageMultiplier = 1 - (distance / waveRadius);
                const damage = Math.floor(waveDamage * damageMultiplier);
                this.damage(id, damage, true);

                // Chain reaction: Apply random status effect
                const effects: Array<'burn' | 'slow' | 'stun'> = ['burn', 'slow', 'stun'];
                const randomEffect = effects[Math.floor(Math.random() * effects.length)];
                
                switch (randomEffect) {
                  case 'burn':
                    this.applyStatusEffect(id, 'burn', 5, 3000);
                    break;
                  case 'slow':
                    this.applyStatusEffect(id, 'slow', 0.5, 2000);
                    break;
                  case 'stun':
                    this.applyStatusEffect(id, 'stun', 1, 1000);
                    break;
                }
              }
            });
          });
        }
      }
    }
  ];

  private readonly comboColors: Record<string, number> = {
    'burn,slow': 0xff8800,      // Orange
    'burn,stun': 0xff0000,      // Red
    'slow,stun': 0x00ffff,      // Cyan
    'burn,slow,stun': 0xffffff  // White
  };

  private readonly comboSymbols: Record<string, string> = {
    'burn,slow': '💥',
    'burn,stun': '💫',
    'slow,stun': '❄️',
    'burn,slow,stun': '☀️'
  };

  private constructor() {
    this.achievementStorage = AchievementStorage.getInstance();
    this.achievementRewards = AchievementRewards.getInstance();
    this.rewardCombinations = RewardCombinations.getInstance();
    this.achievementEffects = AchievementEffects.getInstance();
    this.achievementStats = AchievementStats.getInstance();
    this.achievementChallenges = AchievementChallenges.getInstance();
    this.initializeAchievements();
    this.loadStoredAchievements();
  }

  static getInstance(): CombatSystem {
    if (!CombatSystem.instance) {
      CombatSystem.instance = new CombatSystem();
    }
    return CombatSystem.instance;
  }

  setScene(scene: Phaser.Scene) {
    this.scene = scene;
    this.effects = new DestructionEffect(scene);
    this.achievementEffects.setScene(scene);
    this.achievementStats.setScene(scene);
    this.achievementChallenges.setScene(scene);
    
    // Preload achievement effect assets
    this.achievementEffects.preloadAssets(scene);
  }

  registerEntity(id: string, entity: Damageable): void {
    this.entities.set(id, entity);
    this.createHealthBar(entity);
  }

  unregisterEntity(id: string): void {
    const entity = this.entities.get(id);
    if (entity?.healthBar) {
      entity.healthBar.destroy();
    }
    this.entities.delete(id);
  }

  update() {
    const currentTime = this.scene?.time.now || 0;
    
    // Process active effects
    this.entities.forEach((entity, id) => {
      if (entity.activeEffects) {
        // Check for combos
        const lastCheck = this.lastComboCheck.get(id) || 0;
        if (currentTime - lastCheck >= this.COMBO_CHECK_INTERVAL) {
          this.checkStatusCombos(entity, id);
          this.lastComboCheck.set(id, currentTime);
        }

        // Process individual effects
        entity.activeEffects.forEach((effect, effectId) => {
          if (currentTime - effect.startTime >= effect.duration) {
            // Remove expired effect
            entity.activeEffects.delete(effectId);
            this.updateEffectIndicators(id);
          } else if (effect.type === 'burn') {
            // Apply burn damage every second
            const lastTick = effect.lastTick || effect.startTime;
            if (currentTime - lastTick >= 1000) {
              this.damage(id, effect.strength, true);
              effect.lastTick = currentTime;
            }
          }
        });
      }
    });
  }

  private checkStatusCombos(entity: Damageable, entityId: string) {
    if (!entity.activeEffects) return;

    const activeEffectTypes = new Set(
      Array.from(entity.activeEffects.values()).map(effect => effect.type)
    );

    this.statusCombos.forEach(combo => {
      const hasAllEffects = combo.effects.every(effect => activeEffectTypes.has(effect as any));
      if (hasAllEffects) {
        const comboType = combo.effects.sort().join(',');
        this.trackComboProgress(comboType);
        this.createComboIndicator(entityId, combo.effects);
        combo.onApply(entity);
      }
    });
  }

  private createComboIndicator(entityId: string, effects: string[]) {
    if (!this.scene) return;

    const entity = this.entities.get(entityId);
    if (!entity) return;

    const effectKey = effects.sort().join(',');
    const color = this.comboColors[effectKey];
    const symbol = this.comboSymbols[effectKey];

    if (!color || !symbol) return;

    // Create temporary combo effect indicator
    const text = this.scene.add.text(
      entity.sprite.x,
      entity.sprite.y - 40,
      symbol,
      {
        fontSize: effects.length === 3 ? '32px' : '24px',
        color: `#${color.toString(16).padStart(6, '0')}`
      }
    );
    text.setOrigin(0.5);

    // More dramatic animation for triple combo
    if (effects.length === 3) {
      this.scene.tweens.add({
        targets: text,
        y: text.y - 40,
        alpha: { from: 1, to: 0 },
        scale: { from: 1, to: 2 },
        duration: 1500,
        ease: 'Power2',
        onComplete: () => text.destroy()
      });
    } else {
      this.scene.tweens.add({
        targets: text,
        y: text.y - 20,
        alpha: 0,
        duration: 1000,
        onComplete: () => text.destroy()
      });
    }
  }

  applyStatusEffect(targetId: string, type: 'slow' | 'burn' | 'stun', strength: number, duration: number) {
    const entity = this.entities.get(targetId);
    if (!entity) return;

    // Apply combo duration multiplier from challenge rewards
    let durationMultiplier = this.comboDurationMultiplier;
    if (this.achievementChallenges.isRewardActive('combo')) {
      durationMultiplier *= this.achievementChallenges.getRewardMultiplier('combo');
    }
    
    // Calculate final duration
    const finalDuration = duration * durationMultiplier;

    // Apply the effect to the target
    if (!entity.activeEffects) {
      entity.activeEffects = new Map();
    }

    const effectId = `${type}_${targetId}`;
    const currentTime = this.scene?.time.now || 0;

    // Apply global effect multiplier to duration and strength
    if (this.rewardCombinations.isComboActive('grand_master')) {
      finalDuration *= this.globalEffectMultiplier;
      strength *= this.globalEffectMultiplier;
    }

    entity.activeEffects.set(effectId, {
      type,
      strength,
      duration: finalDuration,
      startTime: currentTime
    });

    this.createEffectIndicator(targetId, type);
    this.updateEffectIndicators(targetId);

    // Check if we should spread effects to nearby enemies
    if (this.statusSpreadRadius > 0 && this.scene) {
      // Get all entities within spread radius
      const targetPosition = entity.sprite.getCenter();
      
      this.entities.forEach((nearbyEntity, nearbyId) => {
        if (nearbyId !== targetId) {
          const nearbyPosition = nearbyEntity.sprite.getCenter();
          const distance = Phaser.Math.Distance.Between(
            targetPosition.x, targetPosition.y,
            nearbyPosition.x, nearbyPosition.y
          );
          
          // Apply effect to nearby entities within radius
          if (distance <= this.statusSpreadRadius) {
            this.applyStatusEffect(nearbyId, type, strength * 0.7, finalDuration * 0.7);
          }
        }
      });
    }
  }

  private createEffectIndicator(entityId: string, type: string) {
    if (!this.scene) return;

    const entity = this.entities.get(entityId);
    if (!entity) return;

    let container = this.effectIndicators.get(entityId);
    if (!container) {
      container = this.scene.add.container(entity.sprite.x, entity.sprite.y - 30);
      this.effectIndicators.set(entityId, container);
    }

    const colors = {
      slow: 0x00ffff,
      burn: 0xff4400,
      stun: 0xffff00
    };

    const symbols = {
      slow: '❄',
      burn: '🔥',
      stun: '⚡'
    };

    const text = this.scene.add.text(0, 0, symbols[type], {
      fontSize: '16px',
      color: `#${colors[type].toString(16).padStart(6, '0')}`
    });
    text.setOrigin(0.5);
    text.setData('effectType', type);
    
    // Position indicators in a row
    const existingEffects = container.list.length;
    text.setPosition(existingEffects * 20 - container.list.length * 10, 0);
    
    container.add(text);
  }

  private updateEffectIndicators(entityId: string) {
    const container = this.effectIndicators.get(entityId);
    const entity = this.entities.get(entityId);
    
    if (!container || !entity || !entity.activeEffects) return;

    // Remove indicators for expired effects
    container.list.forEach((indicator: Phaser.GameObjects.Text) => {
      const effectType = indicator.getData('effectType');
      if (!entity.activeEffects.has(`${effectType}_${entityId}`)) {
        container.remove(indicator, true);
      }
    });

    // Reposition remaining indicators
    container.list.forEach((indicator: Phaser.GameObjects.Text, index) => {
      indicator.setPosition(index * 20 - container.list.length * 10, 0);
    });

    // Update container position
    container.setPosition(entity.sprite.x, entity.sprite.y - 30);
  }

  damage(targetId: string, amount: number, ignoreDefense: boolean = false): void {
    const entity = this.entities.get(targetId);
    if (!entity || !this.effects) return;

    // Apply damage multiplier from challenge rewards
    let damageMultiplier = 1.0;
    if (this.achievementChallenges.isRewardActive('damage')) {
      damageMultiplier = this.achievementChallenges.getRewardMultiplier('damage');
    }
    
    // Apply frozen damage multiplier if applicable
    if (entity.activeEffects?.has('slow') && entity.activeEffects?.has('stun')) {
      damageMultiplier *= this.frozenDamageMultiplier;
    }
    
    // Apply global effect multiplier
    damageMultiplier *= this.globalEffectMultiplier;
    
    // Calculate final damage
    let finalDamage = amount * damageMultiplier;
    
    // Apply global effect multiplier from Grand Master combo
    if (this.rewardCombinations.isComboActive('grand_master')) {
      finalDamage *= this.globalEffectMultiplier;
    }

    const actualDamage = ignoreDefense ? finalDamage : Math.max(1, finalDamage - entity.stats.defense);
    entity.stats.health = Math.max(0, entity.stats.health - actualDamage);

    // Update health bar
    this.updateHealthBar(entity);

    // Create damage effect
    this.effects.createDamageEffect(
      entity.sprite.x,
      entity.sprite.y,
      actualDamage
    );

    // Check if entity is destroyed
    if (entity.stats.health <= 0) {
      this.destroyEntity(targetId, entity);
    }
  }

  heal(targetId: string, amount: number): void {
    const target = this.entities.get(targetId);
    if (!target || !this.effects) return;

    const healAmount = Math.min(
      target.stats.maxHealth - target.stats.health,
      amount
    );

    if (healAmount <= 0) return;

    target.stats.health += healAmount;
    this.updateHealthBar(target);

    // Create heal effect
    this.effects.createHealEffect(
      target.sprite.x,
      target.sprite.y,
      healAmount
    );
  }

  private createHealthBar(entity: Damageable): void {
    if (!this.scene) return;

    const healthBar = this.scene.add.graphics();
    entity.healthBar = healthBar;
    this.updateHealthBar(entity);
  }

  private updateHealthBar(entity: Damageable): void {
    if (!entity.healthBar) return;

    const width = 32;
    const height = 4;
    const x = entity.sprite.x - width / 2;
    const y = entity.sprite.y - entity.sprite.height / 2 - 10;

    entity.healthBar.clear();

    // Background (red)
    entity.healthBar.fillStyle(0xff0000);
    entity.healthBar.fillRect(x, y, width, height);

    // Health (green)
    const healthWidth = (entity.stats.health / entity.stats.maxHealth) * width;
    entity.healthBar.fillStyle(0x00ff00);
    entity.healthBar.fillRect(x, y, healthWidth, height);
  }

  private destroyEntity(id: string, entity: Damageable): void {
    if (this.scene && this.effects) {
      // Create destruction effect with building color
      this.effects.createEffect(
        entity.sprite.x,
        entity.sprite.y,
        entity.sprite.tintTopLeft
      );
    }

    // Remove the entity
    if (entity.healthBar) {
      entity.healthBar.destroy();
    }
    
    // Remove effect indicators
    const effectContainer = this.effectIndicators.get(id);
    if (effectContainer) {
      effectContainer.destroy();
      this.effectIndicators.delete(id);
    }

    entity.sprite.destroy();
    this.entities.delete(id);

    // Emit destruction event
    this.scene?.events.emit('entityDestroyed', { id, entity });
  }

  getEntityStats(id: string): CombatStats | undefined {
    return this.entities.get(id)?.stats;
  }

  private initializeAchievements() {
    // Define tiered achievements
    const createTieredAchievement = (
      baseId: string, 
      baseName: string, 
      baseDesc: string, 
      baseIcon: string,
      bronzeReq: number,
      silverReq: number,
      goldReq: number
    ): Achievement[] => {
      return [
        {
          id: `${baseId}_bronze`,
          name: `${baseName} (Bronze)`,
          description: `${baseDesc} - Bronze Tier`,
          requirement: bronzeReq,
          progress: 0,
          achieved: false,
          icon: baseIcon,
          tier: 'bronze',
          nextTier: `${baseId}_silver`
        },
        {
          id: `${baseId}_silver`,
          name: `${baseName} (Silver)`,
          description: `${baseDesc} - Silver Tier`,
          requirement: silverReq,
          progress: 0,
          achieved: false,
          icon: baseIcon,
          tier: 'silver',
          nextTier: `${baseId}_gold`
        },
        {
          id: `${baseId}_gold`,
          name: `${baseName} (Gold)`,
          description: `${baseDesc} - Gold Tier`,
          requirement: goldReq,
          progress: 0,
          achieved: false,
          icon: baseIcon,
          tier: 'gold'
        }
      ];
    };

    // Create tiered achievements
    const brittleMasterTiers = createTieredAchievement(
      'brittle_master', 'Brittle Master', 'Trigger Brittle combo', '💥',
      20, 50, 100
    );
    
    const explosionExpertTiers = createTieredAchievement(
      'explosion_expert', 'Explosion Expert', 'Trigger Explosion combo', '💫',
      10, 30, 60
    );
    
    const frostLordTiers = createTieredAchievement(
      'frost_lord', 'Frost Lord', 'Trigger Frozen combo', '❄️',
      15, 40, 80
    );
    
    const supernovaMasterTiers = createTieredAchievement(
      'supernova_master', 'Supernova Master', 'Trigger Supernova combo', '🌟',
      3, 10, 25
    );
    
    const comboChainTiers = createTieredAchievement(
      'combo_chain', 'Combo Chain Master', 'Trigger different combos within 5 seconds', '⚡',
      2, 3, 4
    );

    const achievementsList: Achievement[] = [
      // Add all tiered achievements
      ...brittleMasterTiers,
      ...explosionExpertTiers,
      ...frostLordTiers,
      ...supernovaMasterTiers,
      ...comboChainTiers,
      
      // Single-tier achievements
      {
        id: 'supernova_initiate',
        name: 'Supernova Initiate',
        description: 'Trigger first Supernova combo',
        requirement: 1,
        progress: 0,
        achieved: false,
        icon: '☀️'
      },
      {
        id: 'combo_variety',
        name: 'Combo Virtuoso',
        description: 'Trigger all basic combo types at least once',
        requirement: 3,
        progress: 0,
        achieved: false,
        icon: '🎭'
      },
      {
        id: 'rapid_combos',
        name: 'Rapid Striker',
        description: 'Trigger 5 combos within 10 seconds',
        requirement: 5,
        progress: 0,
        achieved: false,
        icon: '⚔️'
      },
      {
        id: 'combo_efficiency',
        name: 'Efficient Tactician',
        description: 'Maintain 3 active combos simultaneously',
        requirement: 3,
        progress: 0,
        achieved: false,
        icon: '🎯'
      }
    ];

    achievementsList.forEach(achievement => {
      this.achievements.set(achievement.id, achievement);
    });
  }

  private loadStoredAchievements() {
    const storedAchievements = this.achievementStorage.loadAchievements();
    
    storedAchievements.forEach(stored => {
      const achievement = this.achievements.get(stored.id);
      if (achievement) {
        achievement.progress = stored.progress;
        achievement.achieved = stored.achieved;
      }
    });
  }

  private trackComboProgress(comboType: string) {
    const currentTime = this.scene?.time.now || 0;
    
    // Update combo stats
    if (!this.comboStats.has(comboType)) {
      this.comboStats.set(comboType, { totalTriggered: 0, chainCount: 0 });
    }
    
    const stats = this.comboStats.get(comboType)!;
    stats.totalTriggered++;
    stats.lastTriggerTime = currentTime;
    
    // Track combo in achievement stats
    const recentCombos = Array.from(this.comboStats.entries())
      .filter(([_, stats]) => {
        return stats.lastTriggerTime && 
               currentTime - stats.lastTriggerTime <= this.COMBO_CHAIN_WINDOW;
      });
    
    // Get chain length (number of unique combos in the chain window)
    const chainLength = new Set(recentCombos.map(([type]) => type)).size;
    
    // Track in achievement stats
    this.achievementStats.trackComboTriggered(comboType, chainLength);

    // Check basic combo achievements
    switch (comboType) {
      case 'burn,slow':
        this.updateAchievement('brittle_master_bronze', stats.totalTriggered);
        this.updateAchievement('brittle_master_silver', stats.totalTriggered);
        this.updateAchievement('brittle_master_gold', stats.totalTriggered);
        break;
      case 'burn,stun':
        this.updateAchievement('explosion_expert_bronze', stats.totalTriggered);
        this.updateAchievement('explosion_expert_silver', stats.totalTriggered);
        this.updateAchievement('explosion_expert_gold', stats.totalTriggered);
        break;
      case 'slow,stun':
        this.updateAchievement('frost_lord_bronze', stats.totalTriggered);
        this.updateAchievement('frost_lord_silver', stats.totalTriggered);
        this.updateAchievement('frost_lord_gold', stats.totalTriggered);
        break;
      case 'burn,slow,stun':
        this.updateAchievement('supernova_initiate', 1);
        this.updateAchievement('supernova_master_bronze', stats.totalTriggered);
        this.updateAchievement('supernova_master_silver', stats.totalTriggered);
        this.updateAchievement('supernova_master_gold', stats.totalTriggered);
        break;
    }

    // Check for combo variety achievement
    const uniqueCombos = new Set(Array.from(this.comboStats.keys()));
    this.updateAchievement('combo_variety', uniqueCombos.size);

    // Check for rapid combos achievement
    const recentCombosTime = Array.from(this.comboStats.entries())
      .filter(([_, stats]) => {
        return stats.lastTriggerTime && 
               currentTime - stats.lastTriggerTime <= 10000; // 10 seconds window
      });
    this.updateAchievement('rapid_combos', recentCombosTime.length);

    // Check for combo efficiency achievement
    const activeCombos = Array.from(this.comboStats.entries())
      .filter(([_, stats]) => {
        return stats.lastTriggerTime && 
               currentTime - stats.lastTriggerTime <= 5000; // Active within last 5 seconds
      });
    this.updateAchievement('combo_efficiency', activeCombos.length);

    // Check for combo chains
    this.checkComboChain(currentTime);
  }

  private checkComboChain(currentTime: number) {
    // Get all combos triggered within the chain window
    const recentCombos = Array.from(this.comboStats.entries())
      .filter(([_, stats]) => {
        return stats.lastTriggerTime && 
               currentTime - stats.lastTriggerTime <= this.COMBO_CHAIN_WINDOW;
      })
      .map(([type]) => type);
    
    // Count unique combo types
    const uniqueComboTypes = new Set(recentCombos);
    
    // Update chain achievements
    this.updateAchievement('combo_chain_bronze', uniqueComboTypes.size);
    this.updateAchievement('combo_chain_silver', uniqueComboTypes.size);
    this.updateAchievement('combo_chain_gold', uniqueComboTypes.size);
  }

  private updateAchievement(id: string, progress: number) {
    if (!this.achievements.has(id)) return;
    
    const achievement = this.achievements.get(id)!;
    
    // Track achievement attempt
    this.achievementStats.trackAchievementAttempt(id);
    
    // Skip if already achieved
    if (achievement.achieved) return;
    
    // Update progress
    achievement.progress = Math.max(achievement.progress, progress);
    
    // Check if achievement is completed
    if (achievement.progress >= achievement.requirement && !achievement.achieved) {
      achievement.achieved = true;
      
      // Announce achievement
      this.announceAchievement(achievement);
      
      // Track achievement unlock in stats
      this.achievementStats.trackAchievementUnlock(achievement);
      
      // Save achievement
      this.achievementStorage.saveAchievements(this.getAchievements());
      
      // Unlock reward if available
      this.achievementRewards.unlockReward(id);
      
      // Check if there's a next tier to progress to
      if (achievement.nextTier && this.achievements.has(achievement.nextTier)) {
        // Copy progress to next tier
        const nextTier = this.achievements.get(achievement.nextTier)!;
        nextTier.progress = achievement.progress;
        
        // Check if next tier is also achieved
        if (nextTier.progress >= nextTier.requirement) {
          this.updateAchievement(achievement.nextTier, nextTier.progress);
        }
      }
    }
  }

  private announceAchievement(achievement: Achievement) {
    if (!this.scene) return;
    
    // Use the achievement effects system for visual celebration
    this.achievementEffects.celebrateAchievement(achievement);
    
    // Emit achievement event
    this.scene.events.emit('achievementUnlocked', achievement);
  }

  getAchievements(): Achievement[] {
    return Array.from(this.achievements.values());
  }

  destroy() {
    // Save all achievements before destroying
    this.achievementStorage.saveAchievements(
      Array.from(this.achievements.values()).map(({ id, progress, achieved }) => ({
        id,
        progress,
        achieved
      }))
    );

    // ... existing destroy code ...

    this.achievementEffects.destroy();
    this.achievementStats.destroy();
    this.achievementChallenges.destroy();
    
    // ... existing cleanup ...
  }

  // Add method to get scene
  getScene(): Phaser.Scene | undefined {
    return this.scene;
  }

  // Getter/setter methods for multipliers
  public setGlobalEffectMultiplier(value: number): void {
    this.globalEffectMultiplier = value;
  }

  public setStatusSpreadRadius(value: number): void {
    this.statusSpreadRadius = value;
  }

  public setComboDurationMultiplier(value: number): void {
    this.comboDurationMultiplier = value;
  }

  public addPermanentDamageBonus(multiplier: number): void {
    this.globalEffectMultiplier *= multiplier;
  }

  public addPermanentRangeBonus(multiplier: number): void {
    this.statusSpreadRadius *= multiplier;
  }

  public addPermanentSpeedBonus(multiplier: number): void {
    this.comboDurationMultiplier *= multiplier;
  }

  public addPermanentResourceBonus(multiplier: number): void {
    // Resource bonus would be handled by a different system
  }

  public addPermanentComboBonus(multiplier: number): void {
    this.brittleMultiplier *= multiplier;
    this.explosionRadiusMultiplier *= multiplier;
    this.frozenDurationMultiplier *= multiplier;
  }
}

export default CombatSystem; 