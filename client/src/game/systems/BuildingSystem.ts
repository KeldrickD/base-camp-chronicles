import Phaser from 'phaser';
import { ProjectileSystem, ProjectileType } from './ProjectileSystem';
import ResourceManager from './ResourceManager';
import { TurretSystem } from './TurretSystem';

interface ProjectileConfig {
  type: ProjectileType;
  position: Phaser.Math.Vector2;
  target: Phaser.Math.Vector2;
  damage: number;
  speed: number;
  splashRadius?: number;
  chainCount?: number;
}

export enum BuildingType {
  TURRET = 'TURRET',
  LASER_TURRET = 'LASER_TURRET',
  MISSILE_TURRET = 'MISSILE_TURRET',
  TESLA_TURRET = 'TESLA_TURRET',
  SHIELD = 'SHIELD',
  COLLECTOR = 'COLLECTOR'
}

interface BuildingStats {
  level: number;
  health: number;
  maxHealth: number;
  defense: number;
  damage?: number;
  range?: number;
  fireRate?: number;
  splashRadius?: number;
  chainCount?: number;
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
  resourceRate?: {
    metal: number;
    energy: number;
    crystals: number;
  };
}

interface Enemy {
  id: string;
  position: Phaser.Math.Vector2;
  sprite: Phaser.GameObjects.Sprite;
}

export interface Building {
  id: string;
  type: BuildingType;
  position: Phaser.Math.Vector2;
  sprite: Phaser.GameObjects.Sprite;
  stats: BuildingStats;
  target?: Phaser.Math.Vector2;
  lastFired?: number;
  update?: (delta: number) => void;
}

interface UpgradeCost {
  metal: number;
  energy: number;
  crystals: number;
}

export class BuildingSystem {
  private scene: Phaser.Scene;
  private resourceManager: ResourceManager;
  private turretSystem: TurretSystem;
  private buildings: Map<string, Building> = new Map();
  private buildingGrid: Map<string, Building>;
  private gridSize: number = 64; // Size of each grid cell in pixels
  private selectedBuilding: Building | null = null;
  private buildingPreview: Phaser.GameObjects.Sprite | null = null;
  private isPlacingBuilding: boolean = false;
  private projectileSystem: ProjectileSystem;
  private nextBuildingId: number = 1;
  private totalBuildingsPlaced: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.resourceManager = new ResourceManager(scene);
    this.turretSystem = new TurretSystem(scene);
    this.buildingGrid = new Map();
    this.projectileSystem = new ProjectileSystem(scene, this.turretSystem);
    this.setupInputHandlers();
    this.setupEventListeners();
  }

  private setupInputHandlers(): void {
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isPlacingBuilding && this.buildingPreview) {
        const gridPos = this.snapToGrid(pointer.x, pointer.y);
        this.buildingPreview.setPosition(gridPos.x, gridPos.y);
        
        // Update preview color based on placement validity
        const canPlace = this.canPlaceBuilding(gridPos);
        this.buildingPreview.setTint(canPlace ? 0x00ff00 : 0xff0000);
      }
    });

    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isPlacingBuilding && this.buildingPreview) {
        const gridPos = this.snapToGrid(pointer.x, pointer.y);
        if (this.canPlaceBuilding(gridPos)) {
          this.placeBuilding(this.selectedBuilding!.type, gridPos);
          this.cancelPlacement();
        }
      }
    });

    // Right click to cancel placement
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        this.cancelPlacement();
      }
    });
  }

  private setupEventListeners(): void {
    // Handle building placement checks
    this.scene.events.on('checkPlacement', (position: Phaser.Math.Vector2, callback: (isValid: boolean) => void) => {
      callback(this.isValidPlacement(position));
    });

    // Handle building placement
    this.scene.events.on('placeBuilding', (data: { type: BuildingType; position: Phaser.Math.Vector2 }) => {
      this.placeBuilding(data.type, data.position);
    });

    // Handle building queries
    this.scene.events.on('queryBuildings', (callback: (buildings: Map<string, Building>) => void) => {
      callback(this.buildings);
    });
  }

  private snapToGrid(x: number, y: number): Phaser.Math.Vector2 {
    const gridX = Math.floor(x / this.gridSize) * this.gridSize + this.gridSize / 2;
    const gridY = Math.floor(y / this.gridSize) * this.gridSize + this.gridSize / 2;
    return new Phaser.Math.Vector2(gridX, gridY);
  }

  private getGridKey(position: Phaser.Math.Vector2): string {
    return `${Math.floor(position.x / this.gridSize)},${Math.floor(position.y / this.gridSize)}`;
  }

  private canPlaceBuilding(position: Phaser.Math.Vector2): boolean {
    const gridKey = this.getGridKey(position);
    
    // Check if grid cell is occupied
    if (this.buildingGrid.has(gridKey)) {
      return false;
    }

    // Check if too close to base (assuming base is at center)
    const centerX = this.scene.cameras.main.centerX;
    const centerY = this.scene.cameras.main.centerY;
    const distanceToBase = Phaser.Math.Distance.Between(
      position.x,
      position.y,
      centerX,
      centerY
    );
    if (distanceToBase < this.gridSize * 2) {
      return false;
    }

    // Check if within game bounds
    const bounds = this.scene.cameras.main.getBounds();
    if (
      position.x < bounds.x + this.gridSize ||
      position.x > bounds.width - this.gridSize ||
      position.y < bounds.y + this.gridSize ||
      position.y > bounds.height - this.gridSize
    ) {
      return false;
    }

    return true;
  }

  public startPlacement(type: BuildingType): void {
    if (this.isPlacingBuilding) {
      this.cancelPlacement();
    }

    const cost = this.getBuildingCost(type);
    if (!this.resourceManager.hasResources(cost)) {
      console.log('Not enough resources to build');
      return;
    }

    this.isPlacingBuilding = true;
    this.selectedBuilding = {
      id: Date.now().toString(),
      type,
      sprite: this.createBuildingSprite(type),
      position: new Phaser.Math.Vector2(0, 0),
      stats: this.getInitialStats(type)
    };

    // Create preview sprite
    this.buildingPreview = this.scene.add.sprite(0, 0, this.getBuildingTexture(type));
    this.buildingPreview.setAlpha(0.7);
  }

  private cancelPlacement(): void {
    if (this.buildingPreview) {
      this.buildingPreview.destroy();
      this.buildingPreview = null;
    }
    this.isPlacingBuilding = false;
    this.selectedBuilding = null;
  }

  private placeBuilding(type: BuildingType, position: Phaser.Math.Vector2): void {
    const cost = this.getBuildingCost(type);
    if (!this.resourceManager.hasResources(cost)) {
      console.log('Not enough resources to build');
      return;
    }

    // Deduct resources
    this.resourceManager.spendResources(cost);

    // Create building
    const building: Building = {
      id: `building_${this.nextBuildingId++}`,
      type,
      sprite: this.createBuildingSprite(type),
      position: position.clone(),
      stats: this.getInitialStats(type)
    };

    // Position the sprite
    building.sprite.setPosition(position.x, position.y);

    // Add to collections
    this.buildings.set(building.id, building);
    this.buildingGrid.set(this.getGridKey(position), building);

    // If it's a turret type, register it with the turret system
    if (this.isTurretType(type)) {
      this.turretSystem.registerTurret({
        id: building.id,
        sprite: building.sprite,
        stats: this.getTurretStats(building),
        position: building.position,
        range: this.getTurretRange(type)
      });
    }

    // Setup resource generation for collectors
    if (type === BuildingType.COLLECTOR) {
      this.setupResourceGeneration(building);
    }

    // Trigger building placed event
    this.scene.events.emit('buildingPlaced', building);
  }

  private createBuildingSprite(type: BuildingType): Phaser.GameObjects.Sprite {
    return this.scene.add.sprite(0, 0, this.getBuildingTexture(type));
  }

  private getBuildingTexture(type: BuildingType): string {
    switch (type) {
      case BuildingType.TURRET:
        return 'turret';
      case BuildingType.LASER_TURRET:
        return 'laser-turret';
      case BuildingType.MISSILE_TURRET:
        return 'missile-turret';
      case BuildingType.TESLA_TURRET:
        return 'tesla-turret';
      case BuildingType.SHIELD:
        return 'shield';
      case BuildingType.COLLECTOR:
        return 'collector';
      default:
        return 'building';
    }
  }

  public getBuildingCost(type: BuildingType): { metal: number; energy: number; crystals: number } {
    switch (type) {
      case BuildingType.TURRET:
        return { metal: 100, energy: 50, crystals: 25 };
      case BuildingType.LASER_TURRET:
        return { metal: 150, energy: 200, crystals: 50 };
      case BuildingType.MISSILE_TURRET:
        return { metal: 200, energy: 100, crystals: 75 };
      case BuildingType.TESLA_TURRET:
        return { metal: 175, energy: 250, crystals: 100 };
      case BuildingType.SHIELD:
        return { metal: 150, energy: 100, crystals: 50 };
      case BuildingType.COLLECTOR:
        return { metal: 75, energy: 25, crystals: 10 };
      default:
        return { metal: 0, energy: 0, crystals: 0 };
    }
  }

  private getInitialStats(type: BuildingType): BuildingStats {
    const baseStats = {
      level: 1,
      health: 100,
      maxHealth: 100,
      defense: 10
    };

    switch (type) {
      case BuildingType.TURRET:
        return {
          ...baseStats,
          damage: 10,
          range: 150,
          fireRate: 1,
          specialAbility: {
            type: 'rapidFire',
            cooldown: 15000, // 15 seconds
            duration: 5000,  // 5 seconds
          }
        };
      case BuildingType.LASER_TURRET:
        return {
          ...baseStats,
          damage: 30,
          range: 200,
          fireRate: 0.5,
          statusEffects: {
            burn: {
              chance: 0.75,
              duration: 3000,
              damage: 5
            }
          },
          specialAbility: {
            type: 'piercing',
            cooldown: 20000 // 20 seconds
          }
        };
      case BuildingType.MISSILE_TURRET:
        return {
          ...baseStats,
          damage: 20,
          range: 150,
          fireRate: 0.75,
          splashRadius: 50,
          specialAbility: {
            type: 'multishot',
            cooldown: 12000, // 12 seconds
            duration: 3000   // 3 seconds
          }
        };
      case BuildingType.TESLA_TURRET:
        return {
          ...baseStats,
          damage: 15,
          range: 150,
          fireRate: 1,
          chainCount: 3,
          statusEffects: {
            stun: {
              chance: 0.3,
              duration: 1000
            }
          },
          specialAbility: {
            type: 'overcharge',
            cooldown: 30000 // 30 seconds
          }
        };
      case BuildingType.SHIELD:
        return {
          ...baseStats,
          range: 150
        };
      case BuildingType.COLLECTOR:
        return {
          ...baseStats,
          resourceRate: {
            metal: 2,
            energy: 1,
            crystals: 0.5
          }
        };
      default:
        return baseStats;
    }
  }

  private isValidPlacement(position: Phaser.Math.Vector2): boolean {
    // Snap to grid
    const gridX = Math.floor(position.x / this.gridSize) * this.gridSize + this.gridSize / 2;
    const gridY = Math.floor(position.y / this.gridSize) * this.gridSize + this.gridSize / 2;

    // Check if position is within game bounds
    if (gridX < 0 || gridX > this.scene.cameras.main.width ||
        gridY < 0 || gridY > this.scene.cameras.main.height) {
      return false;
    }

    // Check if position overlaps with existing buildings
    for (const building of this.buildings.values()) {
      if (Phaser.Math.Distance.Between(
        gridX, gridY,
        building.position.x, building.position.y
      ) < this.gridSize) {
        return false;
      }
    }

    // Check if position is on enemy path
    let isOnPath = false;
    this.scene.events.emit('checkPath', { x: gridX, y: gridY }, (onPath: boolean) => {
      isOnPath = onPath;
    });

    return !isOnPath;
  }

  private setupResourceGeneration(building: Building): void {
    if (!building.stats.resourceRate) return;

    this.resourceManager.addResources(building.stats.resourceRate);
  }

  public update(): void {
    const time = this.scene.time.now;
    this.buildings.forEach(building => {
      if (building.type.includes('TURRET')) {
        this.updateTurret(building, time);
      } else if (building.update) {
        building.update(time);
      }
    });
  }

  private updateTurret(building: Building, time: number): void {
    if (!building.stats.fireRate || !building.stats.range || !building.stats.damage) return;

    const target = this.findTarget(building);

    // Update turret rotation and fire if ready
    if (target) {
      const angle = Phaser.Math.Angle.Between(
        building.position.x,
        building.position.y,
        target.position.x,
        target.position.y
      );
      building.sprite.setRotation(angle);

      // Fire if ready
      if (!building.lastFired || time - building.lastFired >= 1000 / building.stats.fireRate) {
        this.fireTurret(building, target.position);
        building.lastFired = time;
      }
    }
  }

  private findTarget(building: Building): Enemy | undefined {
    let nearestEnemy: Enemy | undefined;
    let nearestDistance = Infinity;

    this.scene.events.emit('queryEnemies', (enemies: Enemy[]) => {
      enemies.forEach(enemy => {
        const distance = Phaser.Math.Distance.Between(
          building.position.x,
          building.position.y,
          enemy.position.x,
          enemy.position.y
        );

        if (distance <= building.stats.range! && distance < nearestDistance) {
          nearestDistance = distance;
          nearestEnemy = enemy;
        }
      });
    });

    return nearestEnemy;
  }

  private fireTurret(building: Building, target: Phaser.Math.Vector2): void {
    if (!building.stats.damage) return;

    const projectileConfig: ProjectileConfig = {
      type: this.getProjectileType(building.type),
      position: building.position.clone(),
      target: target.clone(),
      damage: building.stats.damage,
      speed: 300
    };

    if (building.type === BuildingType.MISSILE_TURRET && building.stats.splashRadius) {
      projectileConfig.splashRadius = building.stats.splashRadius;
    }

    if (building.type === BuildingType.TESLA_TURRET && building.stats.chainCount) {
      projectileConfig.chainCount = building.stats.chainCount;
    }

    this.projectileSystem.createProjectile(projectileConfig);

    // Play fire sound
    this.scene.sound.play(projectileConfig.type.toLowerCase(), { volume: 0.3 });
  }

  private getProjectileType(buildingType: BuildingType): ProjectileType {
    switch (buildingType) {
      case BuildingType.LASER_TURRET:
        return ProjectileType.LASER;
      case BuildingType.MISSILE_TURRET:
        return ProjectileType.MISSILE;
      case BuildingType.TESLA_TURRET:
        return ProjectileType.TESLA;
      default:
        return ProjectileType.BASIC;
    }
  }

  public upgradeBuilding(buildingId: string): void {
    const building = this.buildings.get(buildingId);
    if (!building) return;

    const upgradeCost = this.getUpgradeCost(building);
    if (!this.resourceManager.hasResources(upgradeCost)) {
      console.log('Not enough resources to upgrade');
      return;
    }

    // Deduct resources
    this.resourceManager.spendResources(upgradeCost);

    // Update stats
    this.upgradeStats(building);

    // Update turret if applicable
    if (building.type === BuildingType.TURRET) {
      const turretConfig = {
        id: building.id,
        sprite: building.sprite,
        stats: {
          maxHealth: building.stats.health,
          health: building.stats.health,
          defense: building.stats.defense,
          attackDamage: 10 * building.stats.level,
          attackSpeed: 1 * Math.pow(1.1, building.stats.level - 1),
          attackRange: 200 + (building.stats.level - 1) * 20,
          statusEffects: {
            slow: {
              chance: 0.2 + (building.stats.level - 1) * 0.05,
              duration: 2000 + (building.stats.level - 1) * 500,
              strength: 0.5 + (building.stats.level - 1) * 0.1
            }
          }
        },
        position: building.position,
        range: 200 + (building.stats.level - 1) * 20
      };
      this.turretSystem.registerTurret(turretConfig);
    }

    // Trigger upgrade event
    this.scene.events.emit('buildingUpgraded', building);
  }

  public getUpgradeCost(building: Building): UpgradeCost {
    const baseMultiplier = Math.pow(1.5, building.stats.level);
    
    switch (building.type) {
      case BuildingType.TURRET:
        return {
          metal: Math.floor(75 * baseMultiplier),
          energy: Math.floor(25 * baseMultiplier),
          crystals: 0
        };
      case BuildingType.LASER_TURRET:
        return {
          metal: Math.floor(100 * baseMultiplier),
          energy: Math.floor(75 * baseMultiplier),
          crystals: Math.floor(25 * baseMultiplier)
        };
      case BuildingType.MISSILE_TURRET:
        return {
          metal: Math.floor(150 * baseMultiplier),
          energy: Math.floor(50 * baseMultiplier),
          crystals: Math.floor(25 * baseMultiplier)
        };
      case BuildingType.TESLA_TURRET:
        return {
          metal: Math.floor(125 * baseMultiplier),
          energy: Math.floor(100 * baseMultiplier),
          crystals: Math.floor(50 * baseMultiplier)
        };
      case BuildingType.SHIELD:
        return {
          metal: Math.floor(100 * baseMultiplier),
          energy: Math.floor(150 * baseMultiplier),
          crystals: Math.floor(75 * baseMultiplier)
        };
      case BuildingType.COLLECTOR:
        return {
          metal: Math.floor(150 * baseMultiplier),
          energy: Math.floor(75 * baseMultiplier),
          crystals: Math.floor(25 * baseMultiplier)
        };
      default:
        return { metal: 0, energy: 0, crystals: 0 };
    }
  }

  public destroy(): void {
    this.buildings.forEach(building => building.sprite.destroy());
    this.buildings.clear();
    this.buildingGrid.clear();
    if (this.buildingPreview) {
      this.buildingPreview.destroy();
    }
  }

  public getBuildings(): Map<string, Building> {
    return this.buildings;
  }

  private isTurretType(type: BuildingType): boolean {
    return [
      BuildingType.TURRET,
      BuildingType.LASER_TURRET,
      BuildingType.MISSILE_TURRET,
      BuildingType.TESLA_TURRET
    ].includes(type);
  }

  private getTurretRange(type: BuildingType): number {
    switch (type) {
      case BuildingType.TURRET:
        return 200;
      case BuildingType.LASER_TURRET:
        return 300;
      case BuildingType.MISSILE_TURRET:
        return 250;
      case BuildingType.TESLA_TURRET:
        return 150;
      default:
        return 200;
    }
  }

  private getTurretStats(building: Building): {
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
  } {
    const baseStats = {
      maxHealth: building.stats.health,
      health: building.stats.health,
      defense: building.stats.defense
    };

    switch (building.type) {
      case BuildingType.TURRET:
        return {
          ...baseStats,
          attackDamage: 10 * building.stats.level,
          attackSpeed: 1 * Math.pow(1.1, building.stats.level - 1),
          attackRange: 200 + (building.stats.level - 1) * 20,
          statusEffects: {
            slow: {
              chance: 0.2 + (building.stats.level - 1) * 0.05,
              duration: 2000 + (building.stats.level - 1) * 500,
              strength: 0.5 + (building.stats.level - 1) * 0.1
            }
          }
        };
      case BuildingType.LASER_TURRET:
        return {
          ...baseStats,
          attackDamage: 15 * building.stats.level,
          attackSpeed: 2 * Math.pow(1.1, building.stats.level - 1),
          attackRange: 300 + (building.stats.level - 1) * 25,
          statusEffects: {
            burn: {
              chance: 0.4 + (building.stats.level - 1) * 0.05,
              duration: 3000,
              damage: 5 * building.stats.level
            }
          }
        };
      case BuildingType.MISSILE_TURRET:
        return {
          ...baseStats,
          attackDamage: 25 * building.stats.level,
          attackSpeed: 0.5 * Math.pow(1.1, building.stats.level - 1),
          attackRange: 250 + (building.stats.level - 1) * 15,
          splashRadius: 100 + (building.stats.level - 1) * 10
        };
      case BuildingType.TESLA_TURRET:
        return {
          ...baseStats,
          attackDamage: 20 * building.stats.level,
          attackSpeed: 1.5 * Math.pow(1.1, building.stats.level - 1),
          attackRange: 150 + (building.stats.level - 1) * 10,
          statusEffects: {
            stun: {
              chance: 0.3 + (building.stats.level - 1) * 0.05,
              duration: 1000 + (building.stats.level - 1) * 200
            }
          }
        };
      default:
        return {
          ...baseStats,
          attackDamage: 0,
          attackSpeed: 0,
          attackRange: 0
        };
    }
  }

  public getTotalBuildingsPlaced(): number {
    return this.totalBuildingsPlaced;
  }

  private upgradeStats(building: Building): void {
    const stats = building.stats;
    const level = stats.level + 1;

    // Base stat improvements
    stats.level = level;
    stats.maxHealth *= 1.2;
    stats.health = stats.maxHealth;
    stats.defense *= 1.2;

    // Upgrade specific stats based on building type
    switch (building.type) {
      case BuildingType.TURRET:
        if (stats.damage) stats.damage *= 1.25;
        if (stats.range) stats.range += 20;
        if (stats.fireRate) stats.fireRate *= 1.15;
        if (stats.specialAbility?.type === 'rapidFire') {
          stats.specialAbility.duration = 5000 + (level - 1) * 1000;
        }
        break;

      case BuildingType.LASER_TURRET:
        if (stats.damage) stats.damage *= 1.3;
        if (stats.range) stats.range += 25;
        if (stats.fireRate) stats.fireRate *= 1.1;
        if (stats.statusEffects?.burn) {
          stats.statusEffects.burn.damage *= 1.25;
          stats.statusEffects.burn.chance = Math.min(0.95, stats.statusEffects.burn.chance + 0.05);
        }
        break;

      case BuildingType.MISSILE_TURRET:
        if (stats.damage) stats.damage *= 1.25;
        if (stats.range) stats.range += 15;
        if (stats.fireRate) stats.fireRate *= 1.1;
        if (stats.splashRadius) stats.splashRadius += 10;
        break;

      case BuildingType.TESLA_TURRET:
        if (stats.damage) stats.damage *= 1.2;
        if (stats.range) stats.range += 10;
        if (stats.fireRate) stats.fireRate *= 1.15;
        if (stats.chainCount) stats.chainCount++;
        if (stats.statusEffects?.stun) {
          stats.statusEffects.stun.chance = Math.min(0.8, stats.statusEffects.stun.chance + 0.1);
          stats.statusEffects.stun.duration += 200;
        }
        break;

      case BuildingType.SHIELD:
        if (stats.range) stats.range += 25;
        break;

      case BuildingType.COLLECTOR:
        if (stats.resourceRate) {
          stats.resourceRate.metal *= 1.25;
          stats.resourceRate.energy *= 1.25;
          stats.resourceRate.crystals *= 1.25;
        }
        break;
    }
  }
} 