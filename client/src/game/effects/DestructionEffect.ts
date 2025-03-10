import Phaser from 'phaser';

export class DestructionEffect {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  preload() {
    // Create a simple particle texture
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0xffffff);
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture('particle', 8, 8);
    graphics.destroy();
  }

  createEffect(x: number, y: number, color: number = 0xffffff) {
    const particles = this.scene.add.particles(0, 0, 'particle', {
      speed: { min: 50, max: 150 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      lifespan: { min: 600, max: 800 },
      gravityY: 100,
      tint: color,
      blendMode: 'ADD',
      quantity: 1,
      frequency: 50,
      emitting: false
    });

    particles.setPosition(x, y);
    particles.explode(20);

    // Create a shockwave effect
    const circle = this.scene.add.circle(x, y, 5, color, 0.8);
    
    this.scene.tweens.add({
      targets: circle,
      radius: 40,
      alpha: 0,
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: () => circle.destroy()
    });

    // Clean up particles after animation
    this.scene.time.delayedCall(1000, () => {
      particles.destroy();
    });
  }

  createDamageEffect(x: number, y: number, damage: number) {
    // Create floating damage number
    const text = this.scene.add.text(x, y - 20, `-${damage}`, {
      fontSize: '16px',
      color: '#ff0000',
      stroke: '#000000',
      strokeThickness: 2
    });
    text.setOrigin(0.5);

    // Animate the damage number
    this.scene.tweens.add({
      targets: text,
      y: text.y - 30,
      alpha: 0,
      duration: 1000,
      ease: 'Quad.easeOut',
      onComplete: () => text.destroy()
    });

    // Create small particles for hit effect
    const particles = this.scene.add.particles(0, 0, 'particle', {
      speed: { min: 30, max: 60 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      lifespan: 500,
      tint: 0xff0000,
      blendMode: 'ADD',
      quantity: 1,
      frequency: 50,
      emitting: false
    });

    particles.setPosition(x, y);
    particles.explode(10);

    this.scene.time.delayedCall(600, () => {
      particles.destroy();
    });
  }

  createHealEffect(x: number, y: number, amount: number) {
    // Create floating heal number
    const text = this.scene.add.text(x, y - 20, `+${amount}`, {
      fontSize: '16px',
      color: '#00ff00',
      stroke: '#000000',
      strokeThickness: 2
    });
    text.setOrigin(0.5);

    // Animate the heal number
    this.scene.tweens.add({
      targets: text,
      y: text.y - 30,
      alpha: 0,
      duration: 1000,
      ease: 'Quad.easeOut',
      onComplete: () => text.destroy()
    });

    // Create healing particles
    const particles = this.scene.add.particles(0, 0, 'particle', {
      speed: { min: 20, max: 40 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      lifespan: 800,
      tint: 0x00ff00,
      blendMode: 'ADD',
      quantity: 1,
      frequency: 50,
      emitting: false
    });

    particles.setPosition(x, y);
    particles.explode(15);

    this.scene.time.delayedCall(900, () => {
      particles.destroy();
    });
  }
} 