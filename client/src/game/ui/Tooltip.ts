import Phaser from 'phaser';

export interface TooltipConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  title?: string;
  description?: string;
  stats?: { [key: string]: string | number };
  tips?: string[];
  width?: number;
  padding?: number;
  backgroundColor?: number;
  textColor?: string;
  titleColor?: string;
  statColor?: string;
  tipColor?: string;
}

export class Tooltip extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Rectangle;
  private content: Phaser.GameObjects.Container;
  private config: TooltipConfig;

  constructor(config: TooltipConfig) {
    super(config.scene, config.x, config.y);

    this.config = {
      width: 300,
      padding: 10,
      backgroundColor: 0x000000,
      textColor: '#ffffff',
      titleColor: '#ffff00',
      statColor: '#00ffff',
      tipColor: '#88ff88',
      ...config
    };

    this.background = this.createBackground();
    this.content = this.createContent();

    this.add([this.background, this.content]);
    this.setDepth(1000);
    this.setVisible(false);

    config.scene.add.existing(this);
  }

  private createBackground(): Phaser.GameObjects.Rectangle {
    const bg = new Phaser.GameObjects.Rectangle(
      this.scene,
      0,
      0,
      this.config.width!,
      100,
      this.config.backgroundColor!,
      0.9
    );
    bg.setStrokeStyle(1, 0x333333);
    return bg;
  }

  private createContent(): Phaser.GameObjects.Container {
    const container = new Phaser.GameObjects.Container(this.scene, 0, 0);
    let yOffset = -this.config.width! / 2 + this.config.padding!;

    // Title
    if (this.config.title) {
      const title = this.scene.add.text(0, yOffset, this.config.title, {
        fontSize: '18px',
        color: this.config.titleColor,
        fontStyle: 'bold'
      });
      title.setX(-title.width / 2);
      container.add(title);
      yOffset += title.height + 5;
    }

    // Description
    if (this.config.description) {
      const description = this.scene.add.text(0, yOffset, this.config.description, {
        fontSize: '14px',
        color: this.config.textColor,
        wordWrap: { width: this.config.width! - this.config.padding! * 2 }
      });
      description.setX(-description.width / 2);
      container.add(description);
      yOffset += description.height + 10;
    }

    // Stats
    if (this.config.stats) {
      Object.entries(this.config.stats).forEach(([key, value]) => {
        const statText = this.scene.add.text(
          -this.config.width! / 2 + this.config.padding!,
          yOffset,
          `${key}: ${value}`,
          {
            fontSize: '14px',
            color: this.config.statColor
          }
        );
        container.add(statText);
        yOffset += statText.height + 2;
      });
      yOffset += 5;
    }

    // Tips
    if (this.config.tips && this.config.tips.length > 0) {
      const tipTitle = this.scene.add.text(
        -this.config.width! / 2 + this.config.padding!,
        yOffset,
        'Tips:',
        {
          fontSize: '14px',
          color: this.config.tipColor,
          fontStyle: 'bold'
        }
      );
      container.add(tipTitle);
      yOffset += tipTitle.height + 2;

      this.config.tips.forEach(tip => {
        const tipText = this.scene.add.text(
          -this.config.width! / 2 + this.config.padding! + 10,
          yOffset,
          `• ${tip}`,
          {
            fontSize: '12px',
            color: this.config.tipColor,
            wordWrap: { width: this.config.width! - this.config.padding! * 3 }
          }
        );
        container.add(tipText);
        yOffset += tipText.height + 2;
      });
    }

    // Update background height
    const totalHeight = yOffset + this.config.padding!;
    this.background.setSize(this.config.width!, totalHeight);
    this.background.setPosition(0, totalHeight / 2 - this.config.width! / 2);

    return container;
  }

  public show(x?: number, y?: number): void {
    if (x !== undefined && y !== undefined) {
      this.setPosition(x, y);
    }

    // Ensure tooltip stays within screen bounds
    const bounds = new Phaser.Geom.Rectangle(
      0,
      0,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height
    );

    const tooltipBounds = new Phaser.Geom.Rectangle(
      this.x - this.width / 2,
      this.y - this.height / 2,
      this.width,
      this.height
    );

    if (!Phaser.Geom.Rectangle.ContainsRect(bounds, tooltipBounds)) {
      if (tooltipBounds.x < 0) {
        this.x = this.width / 2;
      }
      if (tooltipBounds.right > bounds.right) {
        this.x = bounds.right - this.width / 2;
      }
      if (tooltipBounds.y < 0) {
        this.y = this.height / 2;
      }
      if (tooltipBounds.bottom > bounds.bottom) {
        this.y = bounds.bottom - this.height / 2;
      }
    }

    this.setVisible(true);
  }

  public hide(): void {
    this.setVisible(false);
  }

  public updateContent(config: Partial<TooltipConfig>): void {
    this.config = { ...this.config, ...config };
    this.content.destroy();
    this.content = this.createContent();
    this.add(this.content);
  }

  public destroy(): void {
    super.destroy();
  }
} 