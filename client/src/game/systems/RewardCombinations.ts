import { AchievementRewards } from './AchievementRewards';
import CombatSystem from './CombatSystem';

interface RewardCombo {
  id: string;
  name: string;
  description: string;
  icon: string;
  requiredRewards: string[];
  effect: (combatSystem: CombatSystem) => void;
}

export class RewardCombinations {
  private static instance: RewardCombinations;
  private combatSystem: CombatSystem;
  private achievementRewards: AchievementRewards;
  private activeRewardCombos: Set<string> = new Set();

  private readonly rewardCombos: RewardCombo[] = [
    {
      id: 'infernal_storm',
      name: 'Infernal Storm',
      description: 'Brittle + Chain Reaction: Explosions apply enhanced burn effects',
      icon: '🌋',
      requiredRewards: ['brittle_master_reward', 'explosion_expert_reward'],
      effect: (combatSystem) => {
        // This will be handled in CombatSystem's explosion effect logic
        // Enhanced burn damage and larger explosion radius combined
      }
    },
    {
      id: 'absolute_zero',
      name: 'Absolute Zero',
      description: 'Deep Freeze + Combo Mastery: Frozen enemies take 50% more damage',
      icon: '❄️',
      requiredRewards: ['frost_lord_reward', 'combo_chain_reward'],
      effect: (combatSystem) => {
        // This will be handled in CombatSystem's damage calculation
        // Increased damage to frozen targets
      }
    },
    {
      id: 'cosmic_resonance',
      name: 'Cosmic Resonance',
      description: 'Stellar Core + Chain Reaction: Supernova waves trigger smaller explosions',
      icon: '✨',
      requiredRewards: ['supernova_initiate_reward', 'explosion_expert_reward'],
      effect: (combatSystem) => {
        // This will be handled in CombatSystem's supernova effect
        // Additional explosions from supernova waves
      }
    },
    {
      id: 'elemental_mastery',
      name: 'Elemental Mastery',
      description: 'Enhanced Brittle + Deep Freeze: Status effects spread to nearby enemies',
      icon: '🌟',
      requiredRewards: ['brittle_master_reward', 'frost_lord_reward'],
      effect: (combatSystem) => {
        // This will be handled in CombatSystem's status effect application
        // Status effect spreading mechanic
      }
    },
    {
      id: 'grand_master',
      name: 'Grand Master',
      description: 'All basic rewards: Ultimate power - All effects enhanced by an additional 25%',
      icon: '👑',
      requiredRewards: [
        'brittle_master_reward',
        'explosion_expert_reward',
        'frost_lord_reward',
        'supernova_initiate_reward',
        'combo_chain_reward'
      ],
      effect: (combatSystem) => {
        // This will be handled in CombatSystem's effect calculations
        // Global 25% boost to all effects
      }
    }
  ];

  private constructor() {
    this.combatSystem = CombatSystem.getInstance();
    this.achievementRewards = AchievementRewards.getInstance();
  }

  static getInstance(): RewardCombinations {
    if (!RewardCombinations.instance) {
      RewardCombinations.instance = new RewardCombinations();
    }
    return RewardCombinations.instance;
  }

  checkCombinations(): void {
    this.rewardCombos.forEach(combo => {
      const hasAllRewards = combo.requiredRewards.every(
        rewardId => this.achievementRewards.isRewardActive(rewardId)
      );

      if (hasAllRewards && !this.activeRewardCombos.has(combo.id)) {
        // Activate new combo
        this.activeRewardCombos.add(combo.id);
        combo.effect(this.combatSystem);
        this.announceCombo(combo);
      } else if (!hasAllRewards && this.activeRewardCombos.has(combo.id)) {
        // Deactivate lost combo
        this.activeRewardCombos.delete(combo.id);
      }
    });
  }

  private announceCombo(combo: RewardCombo): void {
    const scene = this.combatSystem.getScene();
    if (!scene) return;

    // Create combo popup
    const popup = scene.add.container(400, 300);
    
    const background = scene.add.rectangle(0, 0, 300, 120, 0x000000, 0.9);
    background.setStrokeStyle(3, 0xffd700);
    
    const icon = scene.add.text(-120, 0, combo.icon, { fontSize: '40px' });
    icon.setOrigin(0.5);
    
    const title = scene.add.text(-80, -30, 'New Combo Unlocked!', { 
      fontSize: '20px',
      color: '#ffd700',
      fontStyle: 'bold'
    });
    
    const name = scene.add.text(-80, 0, combo.name, { 
      fontSize: '18px',
      color: '#ffffff'
    });
    
    const description = scene.add.text(-80, 25, combo.description, { 
      fontSize: '14px',
      color: '#aaaaaa',
      wordWrap: { width: 260 }
    });

    popup.add([background, icon, title, name, description]);
    popup.setDepth(1000);
    popup.setAlpha(0);
    popup.y = -50;

    // Add particles for more impact
    const particles = scene.add.particles(combo.icon);
    const emitter = particles.createEmitter({
      x: popup.x,
      y: popup.y,
      speed: { min: 50, max: 100 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      lifespan: 1000,
      quantity: 1,
      frequency: 100
    });

    // Animate popup
    scene.tweens.add({
      targets: popup,
      y: 50,
      alpha: 1,
      duration: 1000,
      ease: 'Back.out',
      onComplete: () => {
        scene.time.delayedCall(5000, () => {
          scene.tweens.add({
            targets: [popup, particles],
            y: -50,
            alpha: 0,
            duration: 1000,
            ease: 'Back.in',
            onComplete: () => {
              popup.destroy();
              particles.destroy();
            }
          });
        });
      }
    });

    // Emit combo event
    scene.events.emit('rewardComboUnlocked', combo);
  }

  isComboActive(comboId: string): boolean {
    return this.activeRewardCombos.has(comboId);
  }

  getActiveRewardCombos(): RewardCombo[] {
    return this.rewardCombos.filter(combo => this.activeRewardCombos.has(combo.id));
  }

  getAllRewardCombos(): RewardCombo[] {
    return this.rewardCombos;
  }
} 