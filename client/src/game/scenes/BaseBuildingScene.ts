import Phaser from 'phaser';
import ResourceManager, { Resources } from '../systems/ResourceManager';
import CombatSystem, { CombatStats } from '../systems/CombatSystem';
import { TurretSystem } from '../systems/TurretSystem';

interface BuildingType {
  key: string;
  width: number;
  height: number;
  costs: Partial<Resources>;
  sprite: string;
  description: string;
  stats: CombatStats;
  range?: number;
  effects?: {
    resourceGeneration?: Partial<Resources>;
    defense?: number;
    storage?: Partial<Resources>;
  };
}

export default class BaseBuildingScene extends Phaser.Scene {
  private buildings: Map<string, Phaser.GameObjects.Container> = new Map();
  private currentBuilding: Phaser.GameObjects.Sprite | null = null;
  private resourceManager: ResourceManager;
  private combatSystem: CombatSystem;
  private turretSystem: TurretSystem;
  private resourceText!: Phaser.GameObjects.Text;
  private buildingInfo!: Phaser.GameObjects.Text;
  private nextBuildingId: number = 1;
  private selectedBuilding: string | null = null;

  private buildingTypes: BuildingType[] = [
    {
      key: 'wall',
      width: 32,
      height: 32,
      costs: { metal: 10 },
      sprite: 'wall',
      description: 'Basic defense structure',
      stats: {
        maxHealth: 100,
        health: 100,
        defense: 5
      },
      effects: { defense: 10 }
    },
    {
      key: 'rapidTurret',
      width: 48,
      height: 48,
      costs: { metal: 25, energy: 30 },
      sprite: 'rapid-turret',
      description: 'High rate of fire turret with burn damage',
      stats: {
        maxHealth: 60,
        health: 60,
        defense: 1,
        attackDamage: 8,
        attackRange: 120,
        attackSpeed: 2.5,
        statusEffects: {
          burn: { chance: 0.3, duration: 3000, damage: 3 }
        }
      },
      range: 120,
      effects: { defense: 15 }
    },
    {
      key: 'heavyTurret',
      width: 48,
      height: 48,
      costs: { metal: 45, energy: 25 },
      sprite: 'heavy-turret',
      description: 'High damage turret with stun chance',
      stats: {
        maxHealth: 100,
        health: 100,
        defense: 3,
        attackDamage: 30,
        attackRange: 180,
        attackSpeed: 0.5,
        statusEffects: {
          stun: { chance: 0.15, duration: 1000 }
        }
      },
      range: 180,
      effects: { defense: 35 }
    },
    {
      key: 'areaTurret',
      width: 48,
      height: 48,
      costs: { metal: 40, energy: 40 },
      sprite: 'area-turret',
      description: 'Splash damage turret with slow effect',
      stats: {
        maxHealth: 70,
        health: 70,
        defense: 2,
        attackDamage: 12,
        attackRange: 140,
        attackSpeed: 0.8,
        splashRadius: 60,
        statusEffects: {
          slow: { chance: 0.4, duration: 2000, strength: 0.5 }
        }
      },
      range: 140,
      effects: { defense: 20 }
    },
    {
      key: 'generator',
      width: 64,
      height: 64,
      costs: { metal: 50, crystals: 10 },
      sprite: 'generator',
      description: 'Generates energy over time',
      stats: {
        maxHealth: 50,
        health: 50,
        defense: 0
      },
      effects: { resourceGeneration: { energy: 5 } }
    },
    {
      key: 'mine',
      width: 48,
      height: 48,
      costs: { metal: 40, energy: 15 },
      sprite: 'mine',
      description: 'Extracts metal from the ground',
      stats: {
        maxHealth: 60,
        health: 60,
        defense: 1
      },
      effects: { resourceGeneration: { metal: 2 } }
    },
    {
      key: 'crystalExtractor',
      width: 48,
      height: 64,
      costs: { metal: 60, energy: 30 },
      sprite: 'crystal-extractor',
      description: 'Extracts crystals',
      stats: {
        maxHealth: 40,
        health: 40,
        defense: 1
      },
      effects: { resourceGeneration: { crystals: 1 } }
    },
    {
      key: 'storage',
      width: 64,
      height: 64,
      costs: { metal: 40 },
      sprite: 'storage',
      description: 'Increases resource storage capacity',
      stats: {
        maxHealth: 80,
        health: 80,
        defense: 3
      },
      effects: { storage: { metal: 100, energy: 50, crystals: 20 } }
    }
  ];

  constructor() {
    super({ key: 'BaseBuildingScene' });
    this.resourceManager = ResourceManager.getInstance();
    this.combatSystem = CombatSystem.getInstance();
    this.turretSystem = TurretSystem.getInstance();
  }

  preload() {
    this.load.setBaseURL('/assets/');
    this.createTemporaryAssets();
  }

  create() {
    this.combatSystem.setScene(this);
    this.turretSystem.setScene(this);
    // Initialize building mode
    this.input.keyboard.on('keydown-1', () => this.toggleBuildMode('wall'));
    this.input.keyboard.on('keydown-2', () => this.toggleBuildMode('rapidTurret'));
    this.input.keyboard.on('keydown-3', () => this.toggleBuildMode('heavyTurret'));
    this.input.keyboard.on('keydown-4', () => this.toggleBuildMode('areaTurret'));
    this.input.keyboard.on('keydown-5', () => this.toggleBuildMode('generator'));
    this.input.keyboard.on('keydown-6', () => this.toggleBuildMode('mine'));
    this.input.keyboard.on('keydown-7', () => this.toggleBuildMode('crystalExtractor'));
    this.input.keyboard.on('keydown-8', () => this.toggleBuildMode('storage'));
    this.input.keyboard.on('keydown-ESC', () => this.exitBuildMode());

    // Handle building placement
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.currentBuilding) {
        this.currentBuilding.setPosition(pointer.x, pointer.y);
        this.updateBuildingInfo(pointer.x, pointer.y);
      }
    });

    // Add building selection handler
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        this.handleBuildingSelection(pointer);
      } else if (this.currentBuilding && this.canPlaceBuilding(pointer.x, pointer.y)) {
        this.placeBuilding(pointer.x, pointer.y);
      }
    });

    // Create UI elements
    this.createUI();

    // Subscribe to resource updates
    this.resourceManager.subscribe(this.updateResourceDisplay.bind(this));
  }

  private createTemporaryAssets() {
    const colors = {
      wall: 0x666666,
      'rapid-turret': 0xff3333,
      'heavy-turret': 0x990000,
      'area-turret': 0xff6600,
      generator: 0x00ff00,
      mine: 0xcccccc,
      'crystal-extractor': 0x00ffff,
      storage: 0xffff00
    };

    Object.entries(colors).forEach(([key, color]) => {
      const graphics = this.add.graphics();
      const buildingType = this.buildingTypes.find(type => type.sprite === key);
      if (buildingType) {
        graphics.fillStyle(color);
        graphics.fillRect(0, 0, buildingType.width, buildingType.height);
        graphics.generateTexture(key, buildingType.width, buildingType.height);
        graphics.destroy();
      }
    });
  }

  private createUI() {
    // Resource display
    this.resourceText = this.add.text(16, 16, '', {
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 10, y: 10 }
    });

    // Building info display
    this.buildingInfo = this.add.text(16, 100, '', {
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 10, y: 10 }
    });

    // Controls help
    this.add.text(16, this.game.canvas.height - 100, 
      '1-8: Select Building\nESC: Exit Building Mode\nClick: Place Building', {
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 10, y: 10 }
    });

    this.updateResourceDisplay(this.resourceManager.getResources());
  }

  private updateResourceDisplay(resources: Resources) {
    this.resourceText.setText(
      `Resources:\nMetal: ${resources.metal}\nEnergy: ${resources.energy}\nCrystals: ${resources.crystals}`
    );
  }

  private updateBuildingInfo(x: number, y: number) {
    if (!this.currentBuilding && !this.selectedBuilding) {
      this.buildingInfo.setText('');
      return;
    }

    let text = '';
    let buildingType: BuildingType;

    if (this.currentBuilding) {
      buildingType = this.currentBuilding.getData('type') as BuildingType;
      const canPlace = this.canPlaceBuilding(x, y);
      const hasResources = this.resourceManager.hasEnoughResources(buildingType.costs);
      
      text = `${buildingType.key}\n${buildingType.description}\n\nCosts:`;
      Object.entries(buildingType.costs).forEach(([resource, cost]) => {
        text += `\n${resource}: ${cost}`;
      });

      text += `\n\nStatus: ${!canPlace ? 'Invalid position' : !hasResources ? 'Not enough resources' : 'Ready to build'}`;
    } else if (this.selectedBuilding) {
      const building = this.buildings.get(this.selectedBuilding);
      if (building) {
        buildingType = building.getData('type') as BuildingType;
        text = `${buildingType.key}\n${buildingType.description}\n\nStats:`;
        const stats = this.combatSystem.getEntityStats(this.selectedBuilding);
        if (stats) {
          text += `\nHealth: ${stats.health}/${stats.maxHealth}`;
          text += `\nDefense: ${stats.defense}`;
          if (stats.attackDamage) {
            text += `\nDamage: ${stats.attackDamage}`;
            text += `\nAttack Speed: ${stats.attackSpeed}/s`;
            text += `\nRange: ${buildingType.range}`;
            if (stats.splashRadius) {
              text += `\nSplash Radius: ${stats.splashRadius}`;
            }
            text += '\n\nPress T to cycle targeting mode';
          }
        }
      }
    }

    if (buildingType.effects) {
      text += '\n\nEffects:';
      if (buildingType.effects.defense) {
        text += `\nDefense: +${buildingType.effects.defense}`;
      }
      if (buildingType.effects.resourceGeneration) {
        Object.entries(buildingType.effects.resourceGeneration).forEach(([resource, amount]) => {
          text += `\n${resource} generation: +${amount}/s`;
        });
      }
      if (buildingType.effects.storage) {
        Object.entries(buildingType.effects.storage).forEach(([resource, amount]) => {
          text += `\n${resource} storage: +${amount}`;
        });
      }
    }

    this.buildingInfo.setText(text);
  }

  private toggleBuildMode(buildingKey: string) {
    this.cancelBuildMode();
    const buildingType = this.buildingTypes.find(type => type.key === buildingKey);
    
    if (buildingType) {
      this.currentBuilding = this.add.sprite(0, 0, buildingType.sprite);
      this.currentBuilding.setAlpha(0.7);
      this.currentBuilding.setData('type', buildingType);
    }
  }

  private exitBuildMode() {
    this.cancelBuildMode();
    this.scene.stop();
    this.scene.resume('MainScene');
  }

  private cancelBuildMode() {
    if (this.currentBuilding) {
      this.currentBuilding.destroy();
      this.currentBuilding = null;
      this.buildingInfo.setText('');
    }
  }

  private canPlaceBuilding(x: number, y: number): boolean {
    if (!this.currentBuilding) return false;

    const buildingType = this.currentBuilding.getData('type') as BuildingType;
    
    // Check resources
    if (!this.resourceManager.hasEnoughResources(buildingType.costs)) {
      return false;
    }

    // Check collisions
    const bounds = new Phaser.Geom.Rectangle(
      x - buildingType.width / 2,
      y - buildingType.height / 2,
      buildingType.width,
      buildingType.height
    );

    return !this.buildings.some(building => {
      const otherBounds = building.getBounds();
      return Phaser.Geom.Rectangle.Overlaps(bounds, otherBounds);
    });
  }

  private handleBuildingSelection(pointer: Phaser.Input.Pointer) {
    // Clear previous selection
    if (this.selectedBuilding) {
      this.turretSystem.showRange(this.selectedBuilding, false);
      this.selectedBuilding = null;
    }

    // Find clicked building
    this.buildings.forEach((building, id) => {
      const bounds = building.getBounds();
      if (bounds.contains(pointer.x, pointer.y)) {
        this.selectedBuilding = id;
        const buildingType = building.getData('type') as BuildingType;
        if (buildingType.range) {
          this.turretSystem.showRange(id, true);
          
          // Add keyboard listener for targeting mode changes
          this.input.keyboard.once('keydown-T', () => {
            if (this.selectedBuilding) {
              this.turretSystem.cycleTargetingMode(this.selectedBuilding);
              this.updateBuildingInfo(pointer.x, pointer.y);
            }
          });
        }
      }
    });
  }

  private placeBuilding(x: number, y: number) {
    if (!this.currentBuilding) return;

    const buildingType = this.currentBuilding.getData('type') as BuildingType;
    
    // Spend resources
    if (!this.resourceManager.spendResources(buildingType.costs)) {
      return;
    }

    const building = this.add.container(x, y);
    const sprite = this.add.sprite(0, 0, buildingType.sprite);
    building.add(sprite);
    
    // Add collision body
    const hitArea = new Phaser.Geom.Rectangle(
      -buildingType.width / 2,
      -buildingType.height / 2,
      buildingType.width,
      buildingType.height
    );
    building.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
    
    // Generate unique ID for the building
    const buildingId = `building_${this.nextBuildingId++}`;
    this.buildings.set(buildingId, building);

    // Store building type for reference
    building.setData('type', buildingType);
    sprite.setData('entityId', buildingId);

    // Register with combat system
    this.combatSystem.registerEntity(buildingId, {
      stats: { ...buildingType.stats },
      sprite
    });

    // Register turret if applicable
    if (buildingType.range) {
      this.turretSystem.registerTurret({
        id: buildingId,
        sprite,
        stats: buildingType.stats,
        position: new Phaser.Math.Vector2(x, y),
        range: buildingType.range
      });
    }

    // Set up resource generation if applicable
    if (buildingType.effects?.resourceGeneration) {
      this.setupResourceGeneration(buildingType.effects.resourceGeneration);
    }

    // Emit event for other systems
    this.events.emit('buildingPlaced', {
      id: buildingId,
      type: buildingType.key,
      x,
      y,
      building,
      effects: buildingType.effects
    });
  }

  private setupResourceGeneration(generation: Partial<Resources>) {
    // Add resource generation every second
    this.time.addEvent({
      delay: 1000,
      callback: () => this.resourceManager.addResources(generation),
      loop: true
    });
  }

  update() {
    if (this.currentBuilding) {
      const pointer = this.input.activePointer;
      const canPlace = this.canPlaceBuilding(pointer.x, pointer.y);
      this.currentBuilding.setTint(canPlace ? 0xffffff : 0xff0000);
    }

    // Update turret system
    this.turretSystem.update();
  }
} 