import Phaser from 'phaser';
import { Building, BuildingStats } from '../systems/BuildingSystem';
import { AbilityType } from '../assets/AbilityAssets';
import { AbilityDescriptions } from '../assets/AbilityDescriptions';
import { AbilitySoundConfig } from '../assets/AbilitySounds';
import { AbilityParticles } from '../effects/AbilityParticles';
import { Tooltip } from './Tooltip';

interface AbilityIcon {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Sprite;
  cooldownOverlay: Phaser.GameObjects.Graphics;
  cooldownText: Phaser.GameObjects.Text;
  keyHint: Phaser.GameObjects.Text;
  tooltip: Tooltip;
  chargeIndicators?: Phaser.GameObjects.Rectangle[];
  chargeText?: Phaser.GameObjects.Text;
  abilityType: AbilityType;
  keyNumber: number;
}

interface TurretStats extends BuildingStats {
  abilities?: Record<AbilityType, boolean>;
}

interface TurretBuilding extends Omit<Building, 'stats'> {
  stats: TurretStats;
}

export class TurretAbilityUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private selectedBuilding: TurretBuilding | null = null;
  private abilityIcons: Map<string, AbilityIcon> = new Map();
  private isVisible: boolean = false;
  private activeTooltip: Tooltip | null = null;
  private particleSystem: AbilityParticles;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = this.createContainer();
    this.particleSystem = new AbilityParticles(scene);
    this.setupEventListeners();
  }

  private createContainer(): Phaser.GameObjects.Container {
    const container = this.scene.add.container(10, this.scene.cameras.main.height - 100);
    container.setDepth(100);
    container.setVisible(false);
    return container;
  }

  private setupEventListeners(): void {
    // Listen for building selection/deselection
    this.scene.events.on('buildingSelected', this.handleBuildingSelected, this);
    this.scene.events.on('buildingDeselected', this.handleBuildingDeselected, this);
    
    // Listen for ability activation/cooldown
    this.scene.events.on('abilityActivated', this.handleAbilityActivated, this);
    this.scene.events.on('abilityCooldownUpdate', this.handleCooldownUpdate, this);
    
    // Listen for charge updates
    this.scene.events.on('abilityChargeUpdate', this.handleChargeUpdate, this);

    // Setup keyboard shortcuts
    this.scene.input.keyboard?.on('keydown', this.handleKeyPress, this);
  }

  private handleKeyPress(event: KeyboardEvent): void {
    if (!this.isVisible || !this.selectedBuilding) return;

    const keyNumber = parseInt(event.key);
    if (isNaN(keyNumber) || keyNumber < 1 || keyNumber > 4) return;

    // Find the ability icon with matching key number
    for (const [ability, icon] of this.abilityIcons.entries()) {
      if (icon.keyNumber === keyNumber) {
        this.activateAbility(ability);
        break;
      }
    }
  }

  private activateAbility(ability: string): void {
    if (!this.selectedBuilding) return;

    const icon = this.abilityIcons.get(ability);
    if (!icon || icon.cooldownOverlay.visible) return;

    // Emit ability activation event
    this.scene.events.emit('abilityActivationRequested', this.selectedBuilding.id, ability);

    // Visual feedback for key press
    const keyHintColor = icon.keyHint.style.color;
    icon.keyHint.setColor('#ffff00');
    this.scene.time.delayedCall(100, () => {
      icon.keyHint.setColor(keyHintColor);
    });
  }

  private createAbilityIcon(ability: string, x: number, index: number): AbilityIcon {
    const container = this.scene.add.container(x, 0);

    // Background
    const background = this.scene.add.rectangle(0, 0, 50, 50, 0x333333, 0.8);
    background.setStrokeStyle(2, 0x666666);
    background.setInteractive({ useHandCursor: true });

    // Icon
    const icon = this.scene.add.sprite(0, 0, `ability-${ability}`);
    icon.setScale(0.8);

    // Cooldown overlay
    const cooldownOverlay = this.scene.add.graphics();
    cooldownOverlay.setVisible(false);

    // Cooldown text
    const cooldownText = this.scene.add.text(0, 0, '', {
      fontSize: '16px',
      color: '#ffffff'
    });
    cooldownText.setOrigin(0.5);
    cooldownText.setVisible(false);

    // Key hint (updated to show number)
    const keyNumber = index + 1;
    const keyHint = this.scene.add.text(0, 25, keyNumber.toString(), {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 6, y: 4 }
    });
    keyHint.setOrigin(0.5);

    // Create tooltip with key binding info
    const abilityInfo = AbilityDescriptions[ability as AbilityType];
    const tooltip = new Tooltip({
      scene: this.scene,
      x: 0,
      y: 0,
      title: `${abilityInfo.name} (${keyNumber})`,
      description: abilityInfo.description,
      stats: abilityInfo.stats,
      tips: abilityInfo.tips,
      width: 250
    });

    // Add click handler
    background.on('pointerdown', () => {
      this.activateAbility(ability);
    });

    // Setup hover events
    background.on('pointerover', () => {
      background.setStrokeStyle(2, 0xffffff);
      const worldPos = container.getWorldTransformMatrix();
      tooltip.show(worldPos.tx, worldPos.ty - 60);
      this.activeTooltip = tooltip;
    });

    background.on('pointerout', () => {
      background.setStrokeStyle(2, 0x666666);
      tooltip.hide();
      this.activeTooltip = null;
    });

    // Add charge indicators for Overcharge ability
    let chargeIndicators: Phaser.GameObjects.Rectangle[] | undefined;
    let chargeText: Phaser.GameObjects.Text | undefined;

    if (ability === AbilityType.OVERCHARGE) {
      chargeIndicators = [];
      const maxCharges = 3;
      const indicatorWidth = 10;
      const spacing = 2;
      const totalWidth = (indicatorWidth + spacing) * maxCharges - spacing;
      const startX = -totalWidth / 2;

      for (let i = 0; i < maxCharges; i++) {
        const indicator = this.scene.add.rectangle(
          startX + i * (indicatorWidth + spacing),
          -30,
          indicatorWidth,
          4,
          0x666666
        );
        chargeIndicators.push(indicator);
        container.add(indicator);
      }

      chargeText = this.scene.add.text(0, -40, '0/3', {
        fontSize: '12px',
        color: '#ffffff'
      });
      chargeText.setOrigin(0.5);
      container.add(chargeText);
    }

    container.add([background, icon, cooldownOverlay, cooldownText, keyHint]);
    this.container.add(container);

    return {
      container,
      background,
      icon,
      cooldownOverlay,
      cooldownText,
      keyHint,
      tooltip,
      chargeIndicators,
      chargeText,
      abilityType: ability as AbilityType,
      keyNumber
    };
  }

  private handleBuildingSelected(building: Building): void {
    this.selectedBuilding = building as TurretBuilding;
    this.clearAbilityIcons();

    if (this.selectedBuilding.stats.abilities) {
      let xOffset = 0;
      let index = 0;
      for (const ability of Object.keys(this.selectedBuilding.stats.abilities)) {
        const icon = this.createAbilityIcon(ability, xOffset, index);
        this.abilityIcons.set(ability, icon);
        xOffset += 60;
        index++;
      }
      this.show();
    }
  }

  private handleBuildingDeselected(): void {
    if (this.activeTooltip) {
      this.activeTooltip.hide();
      this.activeTooltip = null;
    }
    this.selectedBuilding = null;
    this.clearAbilityIcons();
    this.hide();
  }

  private handleAbilityActivated(buildingId: string, ability: string): void {
    if (this.selectedBuilding?.id === buildingId) {
      const icon = this.abilityIcons.get(ability);
      if (icon) {
        // Visual feedback for activation
        this.scene.tweens.add({
          targets: icon.container,
          scaleX: { from: 1.2, to: 1 },
          scaleY: { from: 1.2, to: 1 },
          duration: 200,
          ease: 'Quad.easeOut'
        });

        // Get icon world position for particles
        const worldPos = icon.container.getWorldTransformMatrix();

        // Play particle effect
        this.particleSystem.playAbilityEffect(ability as AbilityType, {
          scene: this.scene,
          x: worldPos.tx,
          y: worldPos.ty,
          duration: ability === AbilityType.OVERCHARGE ? 800 : 500
        });

        // Enhanced flash effect for Overcharge based on charge level
        const currentCharge = icon.chargeText ? 
          parseInt(icon.chargeText.text.split('/')[0]) : 1;
        
        const flash = this.scene.add.rectangle(
          icon.container.x,
          icon.container.y,
          50,
          50,
          ability === AbilityType.OVERCHARGE ? 0xff0000 : 0xffffff,
          ability === AbilityType.OVERCHARGE ? 0.3 + (currentCharge * 0.2) : 1
        );
        flash.setBlendMode(Phaser.BlendModes.ADD);
        this.container.add(flash);

        this.scene.tweens.add({
          targets: flash,
          alpha: 0,
          duration: ability === AbilityType.OVERCHARGE ? 300 + (currentCharge * 100) : 200,
          onComplete: () => flash.destroy()
        });

        // Play ability activation sound with config
        const soundKey = this.getAbilitySound(ability as AbilityType);
        const soundConfig = this.getAbilitySoundConfig(ability as AbilityType);
        if (ability === AbilityType.OVERCHARGE) {
          soundConfig.detune = currentCharge * 200;
          soundConfig.volume = 0.4 + (currentCharge * 0.1);
          // Store charge level for particle effects
          this.scene.registry.set('overchargeLevel', currentCharge);
        }
        this.scene.sound.play(soundKey, soundConfig);

        // Reset charge indicators if it's an Overcharge ability
        if (ability === AbilityType.OVERCHARGE && icon.chargeIndicators && icon.chargeText) {
          icon.chargeIndicators.forEach(indicator => indicator.setFillStyle(0x666666));
          icon.chargeText.setText('0/3');
          icon.chargeText.setData('lastCharge', 0);
        }

        // Start cooldown visualization
        this.startCooldownAnimation(ability);
      }
    }
  }

  private getAbilitySound(abilityType: AbilityType): string {
    switch (abilityType) {
      case AbilityType.RAPID_FIRE:
        return 'rapid-fire-activate';
      case AbilityType.PIERCING:
        return 'piercing-activate';
      case AbilityType.MULTISHOT:
        return 'multishot-activate';
      case AbilityType.OVERCHARGE:
        return 'overcharge-activate';
      case AbilityType.TESLA_CHAIN:
        return 'tesla-chain-activate';
      default:
        return 'ability-activate';
    }
  }

  private getAbilitySoundConfig(abilityType: AbilityType): Phaser.Types.Sound.SoundConfig {
    switch (abilityType) {
      case AbilityType.RAPID_FIRE:
        return AbilitySoundConfig.RAPID_FIRE;
      case AbilityType.PIERCING:
        return AbilitySoundConfig.PIERCING;
      case AbilityType.MULTISHOT:
        return AbilitySoundConfig.MULTISHOT;
      case AbilityType.OVERCHARGE:
        return AbilitySoundConfig.OVERCHARGE;
      case AbilityType.TESLA_CHAIN:
        return AbilitySoundConfig.TESLA_CHAIN;
      default:
        return AbilitySoundConfig.GENERIC;
    }
  }

  private handleCooldownUpdate(buildingId: string, ability: string, remainingTime: number, totalTime: number): void {
    if (this.selectedBuilding?.id === buildingId) {
      const icon = this.abilityIcons.get(ability);
      if (icon) {
        this.updateCooldownVisuals(icon, remainingTime, totalTime);
      }
    }
  }

  private startCooldownAnimation(ability: string): void {
    const icon = this.abilityIcons.get(ability);
    if (icon) {
      icon.cooldownOverlay.setVisible(true);
      icon.cooldownText.setVisible(true);
      icon.background.setFillStyle(0x222222);
    }
  }

  private updateCooldownVisuals(icon: AbilityIcon, remainingTime: number, totalTime: number): void {
    // Update cooldown overlay
    const progress = remainingTime / totalTime;
    icon.cooldownOverlay.clear();
    icon.cooldownOverlay.fillStyle(0x000000, 0.6);
    icon.cooldownOverlay.beginPath();
    icon.cooldownOverlay.moveTo(0, 0);
    icon.cooldownOverlay.arc(0, 0, 25, 0, Math.PI * 2 * progress);
    icon.cooldownOverlay.closePath();
    icon.cooldownOverlay.fill();

    // Update cooldown text
    icon.cooldownText.setText(Math.ceil(remainingTime).toString());

    // Reset visuals when cooldown is complete
    if (remainingTime <= 0) {
      icon.cooldownOverlay.setVisible(false);
      icon.cooldownText.setVisible(false);
      icon.background.setFillStyle(0x333333);

      // Play cooldown complete sound with config
      this.scene.sound.play('ability-ready', AbilitySoundConfig.READY);
      
      // Add ready flash effect
      const readyFlash = this.scene.add.rectangle(
        icon.container.x,
        icon.container.y,
        50,
        50,
        0x00ff00,
        0.5
      );
      readyFlash.setBlendMode(Phaser.BlendModes.ADD);
      this.container.add(readyFlash);

      this.scene.tweens.add({
        targets: readyFlash,
        alpha: 0,
        duration: 500,
        onComplete: () => readyFlash.destroy()
      });
    }
  }

  private handleChargeUpdate(buildingId: string, ability: string, currentCharge: number, maxCharge: number): void {
    if (this.selectedBuilding?.id === buildingId) {
      const icon = this.abilityIcons.get(ability);
      if (icon && icon.chargeIndicators && icon.chargeText) {
        // Update charge indicators
        icon.chargeIndicators.forEach((indicator, index) => {
          if (index < currentCharge) {
            indicator.setFillStyle(0x00ff00);
          } else {
            indicator.setFillStyle(0x666666);
          }
        });

        // Update charge text
        icon.chargeText.setText(`${currentCharge}/${maxCharge}`);

        // Add charge gained effect if charge increased
        if (currentCharge > 0 && !icon.chargeText.getData('lastCharge')) {
          const chargeFlash = this.scene.add.rectangle(
            icon.container.x,
            icon.container.y - 30,
            50,
            10,
            0x00ff00,
            0.5
          );
          chargeFlash.setBlendMode(Phaser.BlendModes.ADD);
          this.container.add(chargeFlash);

          this.scene.tweens.add({
            targets: chargeFlash,
            alpha: 0,
            duration: 300,
            onComplete: () => chargeFlash.destroy()
          });

          // Play charge sound
          this.scene.sound.play('overcharge-stack', {
            volume: 0.3,
            detune: currentCharge * 100
          });
        }

        icon.chargeText.setData('lastCharge', currentCharge);
      }
    }
  }

  private clearAbilityIcons(): void {
    this.abilityIcons.forEach(icon => {
      icon.tooltip.destroy();
      icon.container.destroy();
    });
    this.abilityIcons.clear();
  }

  public show(): void {
    this.container.setVisible(true);
    this.isVisible = true;
  }

  public hide(): void {
    this.container.setVisible(false);
    this.isVisible = false;
  }

  public update(): void {
    if (!this.isVisible) return;

    // Add any necessary update logic here
    // For example, smooth cooldown animations or status effect updates
  }

  public destroy(): void {
    this.scene.events.off('buildingSelected', this.handleBuildingSelected, this);
    this.scene.events.off('buildingDeselected', this.handleBuildingDeselected, this);
    this.scene.events.off('abilityActivated', this.handleAbilityActivated, this);
    this.scene.events.off('abilityCooldownUpdate', this.handleCooldownUpdate, this);
    this.scene.events.off('abilityChargeUpdate', this.handleChargeUpdate, this);
    this.scene.input.keyboard?.off('keydown', this.handleKeyPress, this);
    this.particleSystem.destroy();
    this.clearAbilityIcons();
    this.container.destroy();
  }
} 