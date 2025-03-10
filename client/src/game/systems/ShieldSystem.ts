import Phaser from 'phaser';
import { Building, BuildingType } from './BuildingSystem';

interface ShieldAura {
  building: Building;
  sprite: Phaser.GameObjects.Sprite;
  graphics: Phaser.GameObjects.Graphics;
  range: number;
  strength: number;
  protectedBuildings: Set<string>;
}

export class ShieldSystem {
  private scene: Phaser.Scene;
  private shieldAuras: Map<string, ShieldAura> = new Map();
  private protectedBuildings: Map<string, Set<string>> = new Map(); // buildingId -> Set of shieldIds

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public registerShieldBuilding(building: Building): void {
    if (building.type !== BuildingType.SHIELD) return;

    const range = 150 + (building.stats.level - 1) * 25; // Range increases with level
    const strength = 0.3 + (building.stats.level - 1) * 0.1; // Damage reduction increases with level

    // Create shield aura sprite
    const auraSprite = this.scene.add.sprite(building.position.x, building.position.y, 'shield-effect');
    auraSprite.setAlpha(0.3);
    auraSprite.setScale(range / 16); // Assuming shield-effect texture is 32x32
    auraSprite.setDepth(0);

    // Create shield aura visualization
    const graphics = this.scene.add.graphics();
    this.updateShieldGraphics(graphics, building.position, range, strength);

    const aura: ShieldAura = {
      building,
      sprite: auraSprite,
      graphics,
      range,
      strength,
      protectedBuildings: new Set()
    };

    this.shieldAuras.set(building.id, aura);
    this.updateProtectedBuildings();
  }

  public unregisterShieldBuilding(buildingId: string): void {
    const aura = this.shieldAuras.get(buildingId);
    if (!aura) return;

    // Remove protection from buildings
    aura.protectedBuildings.forEach(protectedId => {
      const shields = this.protectedBuildings.get(protectedId);
      if (shields) {
        shields.delete(buildingId);
        if (shields.size === 0) {
          this.protectedBuildings.delete(protectedId);
        }
      }
    });

    // Cleanup graphics
    aura.sprite.destroy();
    aura.graphics.destroy();
    this.shieldAuras.delete(buildingId);
  }

  public updateShieldBuilding(building: Building): void {
    this.unregisterShieldBuilding(building.id);
    this.registerShieldBuilding(building);
  }

  private updateShieldGraphics(
    graphics: Phaser.GameObjects.Graphics,
    position: Phaser.Math.Vector2,
    range: number,
    strength: number
  ): void {
    graphics.clear();
    
    // Draw shield range indicator
    graphics.lineStyle(2, 0x0088ff, 0.3);
    graphics.strokeCircle(position.x, position.y, range);

    // Draw shield effect
    graphics.fillStyle(0x0088ff, 0.1);
    graphics.fillCircle(position.x, position.y, range);
  }

  public updateProtectedBuildings(): void {
    // Clear current protection mappings
    this.protectedBuildings.clear();

    // Update protection for each shield
    this.shieldAuras.forEach(aura => {
      aura.protectedBuildings.clear();

      // Get all buildings in range
      this.scene.events.emit('queryBuildings', (buildings: Map<string, Building>) => {
        buildings.forEach(building => {
          if (building.id !== aura.building.id) {
            const distance = Phaser.Math.Distance.Between(
              aura.building.position.x,
              aura.building.position.y,
              building.position.x,
              building.position.y
            );

            if (distance <= aura.range) {
              aura.protectedBuildings.add(building.id);
              
              // Update protection mapping
              let shields = this.protectedBuildings.get(building.id);
              if (!shields) {
                shields = new Set();
                this.protectedBuildings.set(building.id, shields);
              }
              shields.add(aura.building.id);
            }
          }
        });
      });
    });
  }

  public getProtectionFactor(buildingId: string): number {
    const shields = this.protectedBuildings.get(buildingId);
    if (!shields) return 1;

    // Calculate combined protection from all shields
    // Using diminishing returns formula: 1 - (1 - x1)(1 - x2)...
    let protection = 0;
    shields.forEach(shieldId => {
      const aura = this.shieldAuras.get(shieldId);
      if (aura) {
        protection = protection + (1 - protection) * aura.strength;
      }
    });

    return 1 - protection;
  }

  public update(): void {
    // Pulse shield effect
    this.shieldAuras.forEach(aura => {
      const t = this.scene.time.now / 1000;
      const alpha = 0.2 + Math.sin(t * 2) * 0.1;
      aura.sprite.setAlpha(alpha);
    });
  }

  public destroy(): void {
    this.shieldAuras.forEach(aura => {
      aura.sprite.destroy();
      aura.graphics.destroy();
    });
    this.shieldAuras.clear();
    this.protectedBuildings.clear();
  }
} 