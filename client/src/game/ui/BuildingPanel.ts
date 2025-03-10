import Phaser from 'phaser';
import { BuildingType } from '../systems/BuildingSystem';
import { ResourceManager } from '../systems/ResourceManager';

interface BuildingOption {
  type: BuildingType;
  name: string;
  description: string;
  cost: {
    metal: number;
    energy: number;
    crystals: number;
  };
  sprite: Phaser.GameObjects.Sprite;
  background: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
  container: Phaser.GameObjects.Container;
}

export class BuildingPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private buildingOptions: BuildingOption[] = [];
  private selectedBuilding: BuildingOption | null = null;
  private placementPreview?: {
    sprite: Phaser.GameObjects.Sprite;
    range: Phaser.GameObjects.Graphics;
  };
  private resourceManager: ResourceManager;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = this.scene.add.container(0, 0);
    
    // Get resource manager from scene
    scene.events.emit('getResourceManager', (manager: ResourceManager) => {
      this.resourceManager = manager;
    });

    this.createBuildingOptions();
    this.setupEventListeners();
  }

  private createBuildingOptions(): void {
    const buildings = [
      {
        type: BuildingType.TURRET,
        name: 'Basic Turret',
        description: 'Basic defense turret\nDamage: 10\nRange: 150',
        cost: { metal: 100, energy: 50, crystals: 0 }
      },
      {
        type: BuildingType.LASER_TURRET,
        name: 'Laser Turret',
        description: 'High damage, slow fire rate\nDamage: 30\nRange: 200',
        cost: { metal: 150, energy: 100, crystals: 50 }
      },
      {
        type: BuildingType.MISSILE_TURRET,
        name: 'Missile Turret',
        description: 'Area damage\nDamage: 20\nSplash: 50',
        cost: { metal: 200, energy: 75, crystals: 25 }
      },
      {
        type: BuildingType.TESLA_TURRET,
        name: 'Tesla Turret',
        description: 'Chain lightning\nDamage: 15\nChain: 3',
        cost: { metal: 175, energy: 150, crystals: 75 }
      },
      {
        type: BuildingType.SHIELD,
        name: 'Shield Generator',
        description: 'Protects nearby buildings\nRange: 150\nReduction: 30%',
        cost: { metal: 150, energy: 200, crystals: 100 }
      },
      {
        type: BuildingType.COLLECTOR,
        name: 'Resource Collector',
        description: 'Generates resources\nMetal: +2/s\nEnergy: +1/s',
        cost: { metal: 200, energy: 100, crystals: 50 }
      }
    ];

    let yOffset = 0;
    buildings.forEach(building => {
      const option = this.createBuildingOption(building, yOffset);
      this.buildingOptions.push(option);
      yOffset += 70;
    });
  }

  private createBuildingOption(
    building: {
      type: BuildingType;
      name: string;
      description: string;
      cost: { metal: number; energy: number; crystals: number; }
    },
    yOffset: number
  ): BuildingOption {
    const container = this.scene.add.container(0, yOffset);
    
    // Background
    const background = this.scene.add.rectangle(0, 0, 180, 60, 0x333333);
    background.setOrigin(0);
    background.setInteractive();

    // Building sprite
    const sprite = this.scene.add.sprite(30, 30, building.type.toLowerCase());
    sprite.setScale(1.5);

    // Text
    const text = this.scene.add.text(60, 10, building.name, {
      fontSize: '16px',
      color: '#ffffff'
    });

    // Cost text
    const costText = this.scene.add.text(60, 30, this.formatCost(building.cost), {
      fontSize: '12px',
      color: '#cccccc'
    });

    container.add([background, sprite, text, costText]);
    this.container.add(container);

    // Setup interactions
    background
      .on('pointerover', () => {
        background.setFillStyle(0x444444);
        this.showTooltip(building.description, container.x + 190, container.y);
      })
      .on('pointerout', () => {
        background.setFillStyle(0x333333);
        this.hideTooltip();
      })
      .on('pointerdown', () => {
        this.selectBuilding({
          type: building.type,
          name: building.name,
          description: building.description,
          cost: building.cost,
          sprite,
          background,
          text,
          container
        });
      });

    return {
      type: building.type,
      name: building.name,
      description: building.description,
      cost: building.cost,
      sprite,
      background,
      text,
      container
    };
  }

  private formatCost(cost: { metal: number; energy: number; crystals: number }): string {
    const parts = [];
    if (cost.metal > 0) parts.push(`M:${cost.metal}`);
    if (cost.energy > 0) parts.push(`E:${cost.energy}`);
    if (cost.crystals > 0) parts.push(`C:${cost.crystals}`);
    return parts.join(' ');
  }

  private showTooltip(text: string, x: number, y: number): void {
    const tooltip = this.scene.add.container(x, y);
    
    const background = this.scene.add.rectangle(0, 0, 200, 80, 0x000000, 0.8);
    background.setOrigin(0);
    
    const tooltipText = this.scene.add.text(10, 10, text, {
      fontSize: '14px',
      color: '#ffffff',
      wordWrap: { width: 180 }
    });

    tooltip.add([background, tooltipText]);
    tooltip.setDepth(100);
    this.tooltip = tooltip;
  }

  private hideTooltip(): void {
    if (this.tooltip) {
      this.tooltip.destroy();
      this.tooltip = undefined;
    }
  }

  private selectBuilding(building: BuildingOption): void {
    // Deselect current building if any
    if (this.selectedBuilding) {
      this.selectedBuilding.background.setFillStyle(0x333333);
      this.clearPlacementPreview();
    }

    // Select new building
    this.selectedBuilding = building;
    building.background.setFillStyle(0x666666);

    // Create placement preview
    this.createPlacementPreview(building.type);

    // Emit selection event
    this.scene.events.emit('buildingSelected', building.type);
  }

  private createPlacementPreview(type: BuildingType): void {
    // Create preview sprite
    const sprite = this.scene.add.sprite(0, 0, type.toLowerCase());
    sprite.setAlpha(0.5);

    // Create range indicator
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(2, 0x00ff00, 0.3);

    this.placementPreview = {
      sprite,
      range: graphics
    };

    // Update preview position on pointer move
    this.scene.input.on('pointermove', this.updatePlacementPreview, this);
    this.scene.input.on('pointerdown', this.tryPlaceBuilding, this);
  }

  private updatePlacementPreview(pointer: Phaser.Input.Pointer): void {
    if (!this.placementPreview || !this.selectedBuilding) return;

    const { x, y } = pointer;
    this.placementPreview.sprite.setPosition(x, y);

    // Update range indicator
    this.placementPreview.range.clear();
    if (this.selectedBuilding.type === BuildingType.SHIELD) {
      this.placementPreview.range.strokeCircle(x, y, 150);
    } else if (this.selectedBuilding.type.includes('TURRET')) {
      const range = this.selectedBuilding.type === BuildingType.LASER_TURRET ? 200 : 150;
      this.placementPreview.range.strokeCircle(x, y, range);
    }

    // Check if placement is valid
    this.scene.events.emit('checkPlacement', { x, y }, (isValid: boolean) => {
      this.placementPreview!.sprite.setTint(isValid ? 0xffffff : 0xff0000);
    });
  }

  private tryPlaceBuilding(pointer: Phaser.Input.Pointer): void {
    if (!this.selectedBuilding || !this.placementPreview) return;

    const position = new Phaser.Math.Vector2(pointer.x, pointer.y);

    // Check if placement is valid and we have enough resources
    this.scene.events.emit('checkPlacement', position, (isValid: boolean) => {
      if (isValid && this.resourceManager.hasEnoughResources(this.selectedBuilding!.cost)) {
        // Spend resources
        this.resourceManager.spendResources(this.selectedBuilding!.cost);

        // Place building
        this.scene.events.emit('placeBuilding', {
          type: this.selectedBuilding!.type,
          position
        });

        // Play build sound
        this.scene.sound.play('build', { volume: 0.5 });

        // Clear selection
        this.selectedBuilding!.background.setFillStyle(0x333333);
        this.selectedBuilding = null;
        this.clearPlacementPreview();
      }
    });
  }

  private clearPlacementPreview(): void {
    if (this.placementPreview) {
      this.placementPreview.sprite.destroy();
      this.placementPreview.range.destroy();
      this.placementPreview = undefined;

      this.scene.input.off('pointermove', this.updatePlacementPreview, this);
      this.scene.input.off('pointerdown', this.tryPlaceBuilding, this);
    }
  }

  private setupEventListeners(): void {
    // Cancel building placement on right click
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        if (this.selectedBuilding) {
          this.selectedBuilding.background.setFillStyle(0x333333);
          this.selectedBuilding = null;
          this.clearPlacementPreview();
        }
      }
    });
  }

  public destroy(): void {
    this.clearPlacementPreview();
    this.hideTooltip();
    this.container.destroy();
  }

  private tooltip?: Phaser.GameObjects.Container;

  public update(): void {
    // Update building buttons and status
  }
} 