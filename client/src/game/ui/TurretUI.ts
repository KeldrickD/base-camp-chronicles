import Phaser from 'phaser';
import { Building, BuildingType } from '../systems/BuildingSystem';

interface AbilityIcon {
  background: Phaser.GameObjects.Graphics;
  icon: Phaser.GameObjects.Sprite;
  cooldownOverlay: Phaser.GameObjects.Graphics;
  cooldownText: Phaser.GameObjects.Text;
  container: Phaser.GameObjects.Container;
  keyText: Phaser.GameObjects.Text;
}

interface StatusIcon {
  icon: Phaser.GameObjects.Sprite;
  text: Phaser.GameObjects.Text;
  container: Phaser.GameObjects.Container;
}

export class TurretUI {
  private scene: Phaser.Scene;
  private selectedBuilding: Building | null = null;
  private abilityIcon: AbilityIcon | null = null;
  private statusIcons: Map<string, StatusIcon> = new Map();
  private statsText: Phaser.GameObjects.Text | null = null;
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = this.scene.add.container(10, this.scene.cameras.main.height - 100);
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.scene.events.on('buildingSelected', (building: Building) => {
      this.selectBuilding(building);
    });

    this.scene.events.on('buildingDeselected', () => {
      this.deselectBuilding();
    });

    this.scene.events.on('buildingUpgraded', (building: Building) => {
      if (this.selectedBuilding?.id === building.id) {
        this.updateStats();
      }
    });

    // Listen for ability key presses
    this.scene.input.keyboard?.on('keydown-SPACE', () => {
      if (this.selectedBuilding?.stats.specialAbility) {
        this.scene.events.emit('activateAbility', this.selectedBuilding.id);
      }
    });
  }

  public selectBuilding(building: Building): void {
    this.selectedBuilding = building;
    this.clearUI();

    if (this.isTurretType(building.type)) {
      this.createAbilityIcon();
      this.createStatusIcons();
      this.createStatsDisplay();
    }
  }

  public deselectBuilding(): void {
    this.selectedBuilding = null;
    this.clearUI();
  }

  private clearUI(): void {
    if (this.abilityIcon) {
      this.abilityIcon.container.destroy();
      this.abilityIcon = null;
    }

    this.statusIcons.forEach(icon => icon.container.destroy());
    this.statusIcons.clear();

    if (this.statsText) {
      this.statsText.destroy();
      this.statsText = null;
    }
  }

  private createAbilityIcon(): void {
    if (!this.selectedBuilding?.stats.specialAbility) return;

    const ability = this.selectedBuilding.stats.specialAbility;
    const container = this.scene.add.container(0, 0);

    // Create background
    const background = this.scene.add.graphics();
    background.lineStyle(2, 0x666666);
    background.fillStyle(0x333333);
    background.fillRoundedRect(0, 0, 50, 50, 5);
    background.strokeRoundedRect(0, 0, 50, 50, 5);

    // Create icon
    const icon = this.scene.add.sprite(25, 25, this.getAbilityIconTexture(ability.type));
    icon.setScale(0.4);

    // Create cooldown overlay
    const cooldownOverlay = this.scene.add.graphics();
    cooldownOverlay.fillStyle(0x000000, 0.6);

    // Create cooldown text
    const cooldownText = this.scene.add.text(25, 25, '', {
      fontSize: '16px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Create key hint
    const keyText = this.scene.add.text(25, -15, '[SPACE]', {
      fontSize: '12px',
      color: '#ffffff'
    }).setOrigin(0.5);

    container.add([background, icon, cooldownOverlay, cooldownText, keyText]);
    this.container.add(container);

    this.abilityIcon = {
      background,
      icon,
      cooldownOverlay,
      cooldownText,
      container,
      keyText
    };
  }

  private createStatusIcons(): void {
    if (!this.selectedBuilding?.stats.statusEffects) return;

    let xOffset = 60;
    Object.entries(this.selectedBuilding.stats.statusEffects).forEach(([type, effect]) => {
      const container = this.scene.add.container(xOffset, 0);

      // Create icon
      const icon = this.scene.add.sprite(20, 25, this.getStatusIconTexture(type));
      icon.setScale(0.3);

      // Create text
      const text = this.scene.add.text(20, 45, `${Math.round(effect.chance * 100)}%`, {
        fontSize: '12px',
        color: '#ffffff'
      }).setOrigin(0.5);

      container.add([icon, text]);
      this.container.add(container);

      this.statusIcons.set(type, { icon, text, container });
      xOffset += 40;
    });
  }

  private createStatsDisplay(): void {
    if (!this.selectedBuilding) return;

    const stats = this.selectedBuilding.stats;
    const text = [
      `Level: ${stats.level}`,
      `Damage: ${stats.damage}`,
      `Range: ${stats.range}`,
      `Fire Rate: ${stats.fireRate?.toFixed(2)}/s`,
      `Health: ${Math.round(stats.health)}/${stats.maxHealth}`
    ].join('\\n');

    this.statsText = this.scene.add.text(0, -60, text, {
      fontSize: '14px',
      color: '#ffffff',
      align: 'left'
    });
    this.container.add(this.statsText);
  }

  private getAbilityIconTexture(type: string): string {
    switch (type) {
      case 'rapidFire': return 'ability-rapid-fire';
      case 'piercing': return 'ability-piercing';
      case 'multishot': return 'ability-multishot';
      case 'overcharge': return 'ability-overcharge';
      default: return 'ability-default';
    }
  }

  private getStatusIconTexture(type: string): string {
    switch (type) {
      case 'burn': return 'status-burn';
      case 'slow': return 'status-slow';
      case 'stun': return 'status-stun';
      default: return 'status-default';
    }
  }

  public update(time: number): void {
    if (!this.selectedBuilding || !this.abilityIcon) return;

    const ability = this.selectedBuilding.stats.specialAbility;
    if (!ability) return;

    // Update cooldown display
    if (ability.lastUsed) {
      const cooldownRemaining = Math.max(0, ability.cooldown - (time - ability.lastUsed));
      const cooldownPercent = cooldownRemaining / ability.cooldown;

      if (cooldownPercent > 0) {
        // Update cooldown overlay
        const cooldown = this.abilityIcon.cooldownOverlay;
        cooldown.clear();
        cooldown.fillStyle(0x000000, 0.6);
        cooldown.beginPath();
        cooldown.moveTo(25, 25);
        cooldown.arc(25, 25, 25, -Math.PI / 2, -Math.PI / 2 + (2 * Math.PI * cooldownPercent));
        cooldown.lineTo(25, 25);
        cooldown.closePath();
        cooldown.fill();

        // Update cooldown text
        this.abilityIcon.cooldownText.setText(Math.ceil(cooldownRemaining / 1000).toString());
      } else {
        // Clear cooldown display
        this.abilityIcon.cooldownOverlay.clear();
        this.abilityIcon.cooldownText.setText('');
      }
    }

    // Update status effects
    this.statusIcons.forEach((icon, type) => {
      const effect = this.selectedBuilding?.stats.statusEffects?.[type as keyof typeof this.selectedBuilding.stats.statusEffects];
      if (effect) {
        icon.text.setText(`${Math.round(effect.chance * 100)}%`);
      }
    });

    // Update stats
    this.updateStats();
  }

  private updateStats(): void {
    if (!this.selectedBuilding || !this.statsText) return;

    const stats = this.selectedBuilding.stats;
    const text = [
      `Level: ${stats.level}`,
      `Damage: ${stats.damage}`,
      `Range: ${stats.range}`,
      `Fire Rate: ${stats.fireRate?.toFixed(2)}/s`,
      `Health: ${Math.round(stats.health)}/${stats.maxHealth}`
    ].join('\\n');

    this.statsText.setText(text);
  }

  private isTurretType(type: BuildingType): boolean {
    return [
      BuildingType.TURRET,
      BuildingType.LASER_TURRET,
      BuildingType.MISSILE_TURRET,
      BuildingType.TESLA_TURRET
    ].includes(type);
  }

  public destroy(): void {
    this.clearUI();
    this.container.destroy();
  }
} 