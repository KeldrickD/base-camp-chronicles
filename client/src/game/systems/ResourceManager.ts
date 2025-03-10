export type ResourceType = 'metal' | 'energy' | 'crystals';

interface Resources {
  metal: number;
  energy: number;
  crystals: number;
}

export default class ResourceManager {
  private resources: Resources = {
    metal: 200,
    energy: 100,
    crystals: 50
  };

  private collectedResources: Resources = {
    metal: 0,
    energy: 0,
    crystals: 0
  };

  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public update(_delta: number): void {
    // Update resource generation from collectors
    // Will be implemented when collector buildings are added
  }

  public getCollectedAmount(type: ResourceType): number {
    return this.collectedResources[type];
  }

  public addResources(resources: Partial<Resources>): void {
    Object.entries(resources).forEach(([type, amount]) => {
      const resourceType = type as ResourceType;
      this.resources[resourceType] += amount;
      this.collectedResources[resourceType] += amount;
    });
    this.scene.events.emit('resourcesUpdated', this.resources);
  }

  public hasResources(required: Partial<Resources>): boolean {
    return Object.entries(required).every(([type, amount]) => 
      this.resources[type as ResourceType] >= amount
    );
  }

  public spendResources(cost: Partial<Resources>): boolean {
    if (!this.hasResources(cost)) return false;

    Object.entries(cost).forEach(([type, amount]) => {
      this.resources[type as ResourceType] -= amount;
    });
    this.scene.events.emit('resourcesUpdated', this.resources);
    return true;
  }

  public getResources(): Resources {
    return { ...this.resources };
  }
} 