import Phaser from 'phaser';
import ResourceManager from '../systems/ResourceManager';

interface ResourceDisplay {
  container: Phaser.GameObjects.Container;
  icon: Phaser.GameObjects.Sprite;
  text: Phaser.GameObjects.Text;
  background: Phaser.GameObjects.Rectangle;
}

export class ResourcePanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private resourceManager: ResourceManager;
  private resources: {
    metal: ResourceDisplay;
    energy: ResourceDisplay;
    crystals: ResourceDisplay;
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = this.scene.add.container(10, 10);
    this.resourceManager = new ResourceManager(scene);
    this.createPanel();
  }

  public update(): void {
    const resources = this.resourceManager.getResources();
    this.updateResourceText('metal', resources.metal);
    this.updateResourceText('energy', resources.energy);
    this.updateResourceText('crystals', resources.crystals);
  }

  private updateResourceText(type: string, amount: number): void {
    const text = this.container.getByName(`${type}-text`) as Phaser.GameObjects.Text;
    if (text) {
      text.setText(`${type}: ${Math.floor(amount)}`);
    }
  }

  private createPanel(): void {
    // Create resource displays
    this.resources = {
      metal: this.createResourceDisplay('metal', 0),
      energy: this.createResourceDisplay('energy', 40),
      crystals: this.createResourceDisplay('crystals', 80)
    };

    // Add all displays to container
    Object.values(this.resources).forEach(display => {
      this.container.add(display.container);
    });

    // Initial update
    this.updateDisplay();
  }

  private createResourceDisplay(type: string, y: number): ResourceDisplay {
    const container = this.scene.add.container(0, y);
    
    // Create background
    const background = this.scene.add.rectangle(0, 0, 150, 30, 0x333333);
    background.setOrigin(0);

    // Create icon
    const icon = this.scene.add.sprite(15, 15, `resource-${type}`);
    icon.setScale(0.8);

    // Create text
    const text = this.scene.add.text(40, 8, '0', {
      fontSize: '16px',
      color: this.getResourceColor(type),
      align: 'left'
    });

    container.add([background, icon, text]);

    return {
      container,
      icon,
      text,
      background
    };
  }

  private getResourceColor(type: string): string {
    switch (type) {
      case 'metal':
        return '#cccccc';
      case 'energy':
        return '#ffff00';
      case 'crystals':
        return '#00ffff';
      default:
        return '#ffffff';
    }
  }

  private updateDisplay(): void {
    const resources = this.resourceManager.getResources();

    // Update metal display
    this.resources.metal.text.setText(Math.floor(resources.metal).toString());

    // Update energy display
    this.resources.energy.text.setText(Math.floor(resources.energy).toString());

    // Update crystals display
    this.resources.crystals.text.setText(Math.floor(resources.crystals).toString());

    // Update colors based on affordability
    Object.entries(this.resources).forEach(([type, display]) => {
      const color = this.getResourceColor(type);
      display.text.setColor(color);
    });
  }

  public destroy(): void {
    this.container.destroy();
  }
} 