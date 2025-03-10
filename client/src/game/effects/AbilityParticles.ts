import Phaser from 'phaser';
import { AbilityType } from '../assets/AbilityAssets';

export interface ParticleConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  duration?: number;
  scale?: number;
}

export interface ImpactConfig extends ParticleConfig {
  targetX: number;
  targetY: number;
}

export interface ChargeConfig extends ParticleConfig {
  progress: number; // 0 to 1
  onComplete?: () => void;
}

export interface CursorConfig extends ParticleConfig {
  angle?: number; // Current aim angle
  spread?: number; // Spread angle for multishot
  range?: number; // Maximum range
  powerLevel?: number; // 0 to 1, representing ability power level
  isUpgraded?: boolean; // Whether the ability has been upgraded
}

export class AbilityParticles {
  private scene: Phaser.Scene;
  private activeEffects: Phaser.GameObjects.Group[] = [];
  private activeChargeEffects: Map<string, { group: Phaser.GameObjects.Group, graphics: Phaser.GameObjects.Graphics }> = new Map();
  private activeCursorEffects: Map<string, { group: Phaser.GameObjects.Group, graphics: Phaser.GameObjects.Graphics }> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public playAbilityEffect(type: AbilityType, config: ParticleConfig): void {
    const duration = config.duration || 500;
    const scale = config.scale || 1;
    
    // Add screen shake effect based on ability type
    switch (type) {
      case AbilityType.RAPID_FIRE:
        this.createRapidFireEffect(config, duration * scale);
        this.addScreenShake(0.5 * scale);
        break;
      case AbilityType.PIERCING:
        this.createPiercingEffect(config, duration * scale);
        this.addScreenShake(1 * scale);
        break;
      case AbilityType.MULTISHOT:
        this.createMultishotEffect(config, duration * scale);
        this.addScreenShake(0.8 * scale);
        break;
      case AbilityType.OVERCHARGE:
        this.createOverchargeEffect(config, duration * scale);
        this.addScreenShake(1.5 * scale);
        break;
      case AbilityType.TESLA_CHAIN:
        this.createTeslaEffect(config, duration * scale);
        this.createLightningEffect(config);
        this.addScreenShake(1.2 * scale);
        break;
    }
  }
  
  public playImpactEffect(type: AbilityType, config: ImpactConfig): void {
    const duration = config.duration || 300;
    const scale = config.scale || 1;
    
    switch (type) {
      case AbilityType.RAPID_FIRE:
        this.createRapidFireImpact(config, duration * scale);
        break;
      case AbilityType.PIERCING:
        this.createPiercingImpact(config, duration * scale);
        break;
      case AbilityType.MULTISHOT:
        this.createMultishotImpact(config, duration * scale);
        break;
      case AbilityType.OVERCHARGE:
        this.createOverchargeImpact(config, duration * scale);
        this.addScreenShake(0.3 * scale);
        break;
      case AbilityType.TESLA_CHAIN:
        this.createTeslaImpact(config, duration * scale);
        break;
    }
  }

  public playChargeEffect(type: AbilityType, config: ChargeConfig): void {
    // Cancel any existing charge effect for this ability type
    this.cancelChargeEffect(type);
    
    const particles = this.scene.add.group({ defaultKey: 'particle' });
    const graphics = this.scene.add.graphics();
    
    this.activeChargeEffects.set(type, { group: particles, graphics });
    
    switch (type) {
      case AbilityType.RAPID_FIRE:
        this.createRapidFireCharge(particles, graphics, config);
        break;
      case AbilityType.PIERCING:
        this.createPiercingCharge(particles, graphics, config);
        break;
      case AbilityType.MULTISHOT:
        this.createMultishotCharge(particles, graphics, config);
        break;
      case AbilityType.OVERCHARGE:
        this.createOverchargeCharge(particles, graphics, config);
        break;
      case AbilityType.TESLA_CHAIN:
        this.createTeslaCharge(particles, graphics, config);
        break;
    }
  }

  public updateCursorEffect(type: AbilityType, config: CursorConfig): void {
    // Cancel any existing cursor effect for this ability type
    this.cancelCursorEffect(type);
    
    const particles = this.scene.add.group({ defaultKey: 'particle' });
    const graphics = this.scene.add.graphics();
    
    this.activeCursorEffects.set(type, { group: particles, graphics });
    
    switch (type) {
      case AbilityType.RAPID_FIRE:
        this.createRapidFireCursor(particles, graphics, config);
        break;
      case AbilityType.PIERCING:
        this.createPiercingCursor(particles, graphics, config);
        break;
      case AbilityType.MULTISHOT:
        this.createMultishotCursor(particles, graphics, config);
        break;
      case AbilityType.OVERCHARGE:
        this.createOverchargeCursor(particles, graphics, config);
        break;
      case AbilityType.TESLA_CHAIN:
        this.createTeslaCursor(particles, graphics, config);
        break;
    }
  }

  public cancelChargeEffect(type: AbilityType): void {
    const effect = this.activeChargeEffects.get(type);
    if (effect) {
      effect.group.clear(true, true);
      effect.graphics.destroy();
      this.activeChargeEffects.delete(type);
    }
  }

  public cancelCursorEffect(type: AbilityType): void {
    const effect = this.activeCursorEffects.get(type);
    if (effect) {
      effect.group.clear(true, true);
      effect.graphics.destroy();
      this.activeCursorEffects.delete(type);
    }
  }

  private createRapidFireEffect(config: ParticleConfig, duration: number): void {
    const particles = this.scene.add.group({ defaultKey: 'particle' });
    this.activeEffects.push(particles);

    // Create a group of particles
    for (let i = 0; i < 12; i++) {
      const particle = this.scene.add.image(config.x, config.y, 'particle');
      particles.add(particle);
      
      // Customize the particle
      particle.setTint(0xffaa00);
      particle.setScale(0.5);
      particle.setBlendMode(Phaser.BlendModes.ADD);
      
      // Add random movement
      const angle = Phaser.Math.Between(0, 360);
      const speed = Phaser.Math.Between(100, 200);
      const velocityX = Math.cos(angle * Math.PI / 180) * speed;
      const velocityY = Math.sin(angle * Math.PI / 180) * speed;
      
      // Animate the particle
      this.scene.tweens.add({
        targets: particle,
        x: particle.x + velocityX * (duration / 1000),
        y: particle.y + velocityY * (duration / 1000),
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: duration,
        ease: 'Power2',
        onComplete: () => {
          particle.destroy();
        }
      });
    }
    
    // Create a trailing effect
    this.createRapidFireTrail(config);

    // Clean up after duration
    this.scene.time.delayedCall(duration + 200, () => {
      if (particles) {
        const index = this.activeEffects.indexOf(particles);
        if (index > -1) {
          this.activeEffects.splice(index, 1);
        }
      }
    });
  }

  private createPiercingEffect(config: ParticleConfig, duration: number): void {
    const particles = this.scene.add.group({ defaultKey: 'particle' });
    this.activeEffects.push(particles);

    // Create a group of particles in a focused direction
    for (let i = 0; i < 15; i++) {
      const particle = this.scene.add.image(config.x, config.y, 'particle');
      particles.add(particle);
      
      // Customize the particle
      particle.setTint(0x00ffff);
      particle.setScale(0.4);
      particle.setBlendMode(Phaser.BlendModes.ADD);
      
      // Add directional movement
      const angle = Phaser.Math.Between(-15, 15); // focused angle
      const speed = Phaser.Math.Between(150, 250);
      const velocityX = Math.cos(angle * Math.PI / 180) * speed;
      const velocityY = Math.sin(angle * Math.PI / 180) * speed;
      
      // Animate the particle
      this.scene.tweens.add({
        targets: particle,
        x: particle.x + velocityX * (duration / 1000),
        y: particle.y + velocityY * (duration / 1000),
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: duration,
        ease: 'Power2',
        onComplete: () => {
          particle.destroy();
        }
      });
    }

    // Clean up after duration
    this.scene.time.delayedCall(duration + 200, () => {
      if (particles) {
        const index = this.activeEffects.indexOf(particles);
        if (index > -1) {
          this.activeEffects.splice(index, 1);
        }
      }
    });
  }

  private createMultishotEffect(config: ParticleConfig, duration: number): void {
    const particles = this.scene.add.group({ defaultKey: 'particle' });
    this.activeEffects.push(particles);

    // Create multiple bursts of particles
    for (let burst = 0; burst < 3; burst++) {
      // Stagger the bursts slightly
      this.scene.time.delayedCall(burst * 80, () => {
        // Create particles for each burst
        for (let i = 0; i < 8; i++) {
          const particle = this.scene.add.image(config.x, config.y, 'particle');
          particles.add(particle);
          
          // Customize the particle
          particle.setTint(0xff00ff);
          particle.setScale(0.3);
          particle.setBlendMode(Phaser.BlendModes.ADD);
          
          // Add spreading movement
          const angle = Phaser.Math.Between(-45, 45);
          const speed = Phaser.Math.Between(80, 160);
          const velocityX = Math.cos(angle * Math.PI / 180) * speed;
          const velocityY = Math.sin(angle * Math.PI / 180) * speed;
          
          // Animate the particle
          this.scene.tweens.add({
            targets: particle,
            x: particle.x + velocityX * (duration / 1000),
            y: particle.y + velocityY * (duration / 1000),
            scaleX: 0,
            scaleY: 0,
            alpha: 0,
            duration: duration * 0.8,
            ease: 'Power2',
            onComplete: () => {
              particle.destroy();
            }
          });
        }
      });
    }

    // Clean up after duration
    this.scene.time.delayedCall(duration + 300, () => {
      if (particles) {
        const index = this.activeEffects.indexOf(particles);
        if (index > -1) {
          this.activeEffects.splice(index, 1);
        }
      }
    });
  }

  private createOverchargeEffect(config: ParticleConfig, duration: number): void {
    const particles = this.scene.add.group({ defaultKey: 'particle' });
    this.activeEffects.push(particles);

    // Create a large explosion of particles
    for (let i = 0; i < 20; i++) {
      const particle = this.scene.add.image(config.x, config.y, 'particle');
      particles.add(particle);
      
      // Customize the particle
      particle.setTint(0xff0000);
      particle.setScale(0.6);
      particle.setBlendMode(Phaser.BlendModes.ADD);
      
      // Add explosive movement
      const angle = Phaser.Math.Between(0, 360);
      const speed = Phaser.Math.Between(150, 300);
      const velocityX = Math.cos(angle * Math.PI / 180) * speed;
      const velocityY = Math.sin(angle * Math.PI / 180) * speed - 50; // Slight upward drift
      
      // Animate the particle
      this.scene.tweens.add({
        targets: particle,
        x: particle.x + velocityX * (duration / 1000),
        y: particle.y + velocityY * (duration / 1000),
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: duration,
        ease: 'Power2',
        onComplete: () => {
          particle.destroy();
        }
      });
    }

    // Create a central flash
    const flash = this.scene.add.image(config.x, config.y, 'particle');
    flash.setTint(0xffffff);
    flash.setScale(0.1);
    flash.setBlendMode(Phaser.BlendModes.ADD);
    
    this.scene.tweens.add({
      targets: flash,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        flash.destroy();
      }
    });

    // Clean up after duration
    this.scene.time.delayedCall(duration + 200, () => {
      if (particles) {
        const index = this.activeEffects.indexOf(particles);
        if (index > -1) {
          this.activeEffects.splice(index, 1);
        }
      }
    });
  }

  private createTeslaEffect(config: ParticleConfig, duration: number): void {
    const particles = this.scene.add.group({ defaultKey: 'particle' });
    this.activeEffects.push(particles);

    // Create electric particles
    for (let i = 0; i < 16; i++) {
      const particle = this.scene.add.image(config.x, config.y, 'particle');
      particles.add(particle);
      
      // Customize the particle
      particle.setTint(0x4444ff);
      particle.setScale(0.4);
      particle.setBlendMode(Phaser.BlendModes.ADD);
      
      // Add radial movement
      const angle = Phaser.Math.Between(0, 360);
      const speed = Phaser.Math.Between(100, 200);
      const velocityX = Math.cos(angle * Math.PI / 180) * speed;
      const velocityY = Math.sin(angle * Math.PI / 180) * speed;
      
      // Animate the particle
      this.scene.tweens.add({
        targets: particle,
        x: particle.x + velocityX * (duration / 1000),
        y: particle.y + velocityY * (duration / 1000),
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: duration,
        ease: 'Power2',
        onComplete: () => {
          particle.destroy();
        }
      });
    }

    // Clean up after duration
    this.scene.time.delayedCall(duration + 200, () => {
      if (particles) {
        const index = this.activeEffects.indexOf(particles);
        if (index > -1) {
          this.activeEffects.splice(index, 1);
        }
      }
    });
  }
  
  private createRapidFireImpact(config: ImpactConfig, duration: number): void {
    const particles = this.scene.add.group({ defaultKey: 'particle' });
    this.activeEffects.push(particles);
    
    // Create impact particles
    for (let i = 0; i < 8; i++) {
      const particle = this.scene.add.image(config.targetX, config.targetY, 'particle');
      particles.add(particle);
      
      // Customize the particle
      particle.setTint(0xffaa00);
      particle.setScale(0.3);
      particle.setBlendMode(Phaser.BlendModes.ADD);
      
      // Add outward movement
      const angle = Phaser.Math.Between(0, 360);
      const speed = Phaser.Math.Between(30, 80);
      const velocityX = Math.cos(angle * Math.PI / 180) * speed;
      const velocityY = Math.sin(angle * Math.PI / 180) * speed;
      
      // Animate the particle
      this.scene.tweens.add({
        targets: particle,
        x: particle.x + velocityX * (duration / 1000),
        y: particle.y + velocityY * (duration / 1000),
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: duration,
        ease: 'Power2',
        onComplete: () => {
          particle.destroy();
        }
      });
    }
    
    // Create a small flash
    const flash = this.scene.add.image(config.targetX, config.targetY, 'particle');
    flash.setTint(0xffcc66);
    flash.setScale(0.1);
    flash.setBlendMode(Phaser.BlendModes.ADD);
    
    this.scene.tweens.add({
      targets: flash,
      scaleX: 1,
      scaleY: 1,
      alpha: 0,
      duration: 150,
      ease: 'Power2',
      onComplete: () => {
        flash.destroy();
      }
    });
    
    // Clean up after duration
    this.scene.time.delayedCall(duration + 100, () => {
      if (particles) {
        const index = this.activeEffects.indexOf(particles);
        if (index > -1) {
          this.activeEffects.splice(index, 1);
        }
      }
    });
  }
  
  private createPiercingImpact(config: ImpactConfig, duration: number): void {
    const particles = this.scene.add.group({ defaultKey: 'particle' });
    this.activeEffects.push(particles);
    
    // Calculate angle from source to target
    const dx = config.targetX - config.x;
    const dy = config.targetY - config.y;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    // Create impact particles
    for (let i = 0; i < 12; i++) {
      const particle = this.scene.add.image(config.targetX, config.targetY, 'particle');
      particles.add(particle);
      
      // Customize the particle
      particle.setTint(0x00ffff);
      particle.setScale(0.3);
      particle.setBlendMode(Phaser.BlendModes.ADD);
      
      // Add directional outward movement
      const particleAngle = angle + Phaser.Math.Between(-30, 30);
      const speed = Phaser.Math.Between(50, 120);
      const velocityX = Math.cos(particleAngle * Math.PI / 180) * speed;
      const velocityY = Math.sin(particleAngle * Math.PI / 180) * speed;
      
      // Animate the particle
      this.scene.tweens.add({
        targets: particle,
        x: particle.x + velocityX * (duration / 1000),
        y: particle.y + velocityY * (duration / 1000),
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: duration,
        ease: 'Power2',
        onComplete: () => {
          particle.destroy();
        }
      });
    }
    
    // Create a piercing trail
    const trail = this.scene.add.graphics();
    trail.lineStyle(3, 0x00ffff, 0.7);
    trail.beginPath();
    trail.moveTo(config.x, config.y);
    trail.lineTo(config.targetX, config.targetY);
    trail.strokePath();
    
    this.scene.tweens.add({
      targets: trail,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        trail.destroy();
      }
    });
    
    // Clean up after duration
    this.scene.time.delayedCall(duration + 100, () => {
      if (particles) {
        const index = this.activeEffects.indexOf(particles);
        if (index > -1) {
          this.activeEffects.splice(index, 1);
        }
      }
    });
  }
  
  private createMultishotImpact(config: ImpactConfig, duration: number): void {
    const particles = this.scene.add.group({ defaultKey: 'particle' });
    this.activeEffects.push(particles);
    
    // Create impact particles with staggered effect
    for (let burst = 0; burst < 2; burst++) {
      this.scene.time.delayedCall(burst * 50, () => {
        for (let i = 0; i < 6; i++) {
          const particle = this.scene.add.image(config.targetX, config.targetY, 'particle');
          particles.add(particle);
          
          // Customize the particle
          particle.setTint(0xff00ff);
          particle.setScale(0.25);
          particle.setBlendMode(Phaser.BlendModes.ADD);
          
          // Add outward movement
          const angle = Phaser.Math.Between(0, 360);
          const speed = Phaser.Math.Between(40, 100);
          const velocityX = Math.cos(angle * Math.PI / 180) * speed;
          const velocityY = Math.sin(angle * Math.PI / 180) * speed;
          
          // Animate the particle
          this.scene.tweens.add({
            targets: particle,
            x: particle.x + velocityX * (duration / 1000),
            y: particle.y + velocityY * (duration / 1000),
            scaleX: 0,
            scaleY: 0,
            alpha: 0,
            duration: duration * 0.7,
            ease: 'Power2',
            onComplete: () => {
              particle.destroy();
            }
          });
        }
      });
    }
    
    // Clean up after duration
    this.scene.time.delayedCall(duration + 150, () => {
      if (particles) {
        const index = this.activeEffects.indexOf(particles);
        if (index > -1) {
          this.activeEffects.splice(index, 1);
        }
      }
    });
  }
  
  private createOverchargeImpact(config: ImpactConfig, duration: number): void {
    const particles = this.scene.add.group({ defaultKey: 'particle' });
    this.activeEffects.push(particles);
    
    // Create explosion particles
    for (let i = 0; i < 15; i++) {
      const particle = this.scene.add.image(config.targetX, config.targetY, 'particle');
      particles.add(particle);
      
      // Customize the particle
      particle.setTint(0xff0000);
      particle.setScale(0.4);
      particle.setBlendMode(Phaser.BlendModes.ADD);
      
      // Add explosive movement
      const angle = Phaser.Math.Between(0, 360);
      const speed = Phaser.Math.Between(70, 200);
      const velocityX = Math.cos(angle * Math.PI / 180) * speed;
      const velocityY = Math.sin(angle * Math.PI / 180) * speed;
      
      // Animate the particle
      this.scene.tweens.add({
        targets: particle,
        x: particle.x + velocityX * (duration / 1000),
        y: particle.y + velocityY * (duration / 1000),
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: duration,
        ease: 'Power2',
        onComplete: () => {
          particle.destroy();
        }
      });
    }
    
    // Create explosion ring
    const ring = this.scene.add.graphics();
    ring.lineStyle(3, 0xff3300, 0.8);
    ring.beginPath();
    ring.arc(config.targetX, config.targetY, 5, 0, Math.PI * 2);
    ring.strokePath();
    
    this.scene.tweens.add({
      targets: ring,
      scaleX: 8,
      scaleY: 8,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        ring.destroy();
      }
    });
    
    // Create a flash
    const flash = this.scene.add.image(config.targetX, config.targetY, 'particle');
    flash.setTint(0xff5500);
    flash.setScale(0.2);
    flash.setBlendMode(Phaser.BlendModes.ADD);
    
    this.scene.tweens.add({
      targets: flash,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        flash.destroy();
      }
    });
    
    // Clean up after duration
    this.scene.time.delayedCall(duration + 100, () => {
      if (particles) {
        const index = this.activeEffects.indexOf(particles);
        if (index > -1) {
          this.activeEffects.splice(index, 1);
        }
      }
    });
  }
  
  private createTeslaImpact(config: ImpactConfig, duration: number): void {
    const particles = this.scene.add.group({ defaultKey: 'particle' });
    this.activeEffects.push(particles);
    
    // Create electric impact particles
    for (let i = 0; i < 10; i++) {
      const particle = this.scene.add.image(config.targetX, config.targetY, 'particle');
      particles.add(particle);
      
      // Customize the particle
      particle.setTint(0x4444ff);
      particle.setScale(0.3);
      particle.setBlendMode(Phaser.BlendModes.ADD);
      
      // Add radial movement
      const angle = Phaser.Math.Between(0, 360);
      const speed = Phaser.Math.Between(50, 120);
      const velocityX = Math.cos(angle * Math.PI / 180) * speed;
      const velocityY = Math.sin(angle * Math.PI / 180) * speed;
      
      // Animate the particle
      this.scene.tweens.add({
        targets: particle,
        x: particle.x + velocityX * (duration / 1000),
        y: particle.y + velocityY * (duration / 1000),
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: duration,
        ease: 'Power2',
        onComplete: () => {
          particle.destroy();
        }
      });
    }
    
    // Create mini-lightning from impact point
    for (let j = 0; j < 3; j++) {
      const lightning = this.scene.add.graphics();
      lightning.lineStyle(1, 0x6666ff, 0.8);
      
      const angle = Phaser.Math.Between(0, 360);
      const distance = Phaser.Math.Between(20, 50);
      const endX = config.targetX + Math.cos(angle * Math.PI / 180) * distance;
      const endY = config.targetY + Math.sin(angle * Math.PI / 180) * distance;
      
      lightning.beginPath();
      lightning.moveTo(config.targetX, config.targetY);
      
      const segments = 3;
      for (let k = 1; k <= segments; k++) {
        const progress = k / segments;
        const pathX = config.targetX + (endX - config.targetX) * progress;
        const pathY = config.targetY + (endY - config.targetY) * progress;
        
        const offset = (k !== segments) ? Phaser.Math.Between(-10, 10) : 0;
        const perpX = -Math.sin(angle * Math.PI / 180) * offset;
        const perpY = Math.cos(angle * Math.PI / 180) * offset;
        
        lightning.lineTo(pathX + perpX, pathY + perpY);
      }
      
      lightning.strokePath();
      
      this.scene.tweens.add({
        targets: lightning,
        alpha: 0,
        duration: 150,
        delay: j * 30,
        onComplete: () => {
          lightning.destroy();
        }
      });
    }
    
    // Clean up after duration
    this.scene.time.delayedCall(duration + 100, () => {
      if (particles) {
        const index = this.activeEffects.indexOf(particles);
        if (index > -1) {
          this.activeEffects.splice(index, 1);
        }
      }
    });
  }

  private addScreenShake(intensity: number): void {
    if (!this.scene.cameras.main) return;
    
    // Scale intensity based on input
    const shakeIntensity = intensity * 0.01;
    const shakeDuration = intensity * 100;
    
    this.scene.cameras.main.shake(shakeDuration, shakeIntensity);
  }

  private createLightningEffect(config: ParticleConfig): void {
    // Create lightning arcs for Tesla Chain ability
    const centerX = config.x;
    const centerY = config.y;
    
    // Create multiple lightning arcs
    for (let i = 0; i < 3; i++) {
      // Create a graphics object to draw the lightning
      const lightning = this.scene.add.graphics();
      lightning.lineStyle(2, 0x66aaff, 1);
      
      // Create endpoint for the lightning
      const angle = Phaser.Math.Between(0, 360);
      const distance = Phaser.Math.Between(50, 150);
      const endX = centerX + Math.cos(angle * Math.PI / 180) * distance;
      const endY = centerY + Math.sin(angle * Math.PI / 180) * distance;
      
      // Draw a zigzag line for the lightning effect
      lightning.beginPath();
      lightning.moveTo(centerX, centerY);
      
      const segments = 5;
      for (let j = 1; j <= segments; j++) {
        const progress = j / segments;
        const pathX = centerX + (endX - centerX) * progress;
        const pathY = centerY + (endY - centerY) * progress;
        
        // Add randomness to zigzag
        const offset = (j !== segments) ? Phaser.Math.Between(-15, 15) : 0;
        const perpX = -Math.sin(angle * Math.PI / 180) * offset;
        const perpY = Math.cos(angle * Math.PI / 180) * offset;
        
        lightning.lineTo(pathX + perpX, pathY + perpY);
      }
      
      lightning.strokePath();
      
      // Fade out the lightning
      this.scene.tweens.add({
        targets: lightning,
        alpha: 0,
        duration: 200,
        delay: i * 50,
        onComplete: () => {
          lightning.destroy();
        }
      });
    }
  }

  private createRapidFireTrail(config: ParticleConfig): void {
    const trail = this.scene.add.graphics();
    trail.lineStyle(2, 0xffaa00, 0.8);
    
    // Create a circle path
    const radius = 30;
    trail.beginPath();
    trail.arc(config.x, config.y, radius, 0, Math.PI * 2);
    trail.strokePath();
    
    // Fade out the trail
    this.scene.tweens.add({
      targets: trail,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        trail.destroy();
      }
    });
  }

  private createRapidFireCharge(particles: Phaser.GameObjects.Group, graphics: Phaser.GameObjects.Graphics, config: ChargeConfig): void {
    // Create spinning particles
    const numParticles = 8;
    const radius = 30;
    
    for (let i = 0; i < numParticles; i++) {
      const angle = (i / numParticles) * Math.PI * 2;
      const x = config.x + Math.cos(angle) * radius;
      const y = config.y + Math.sin(angle) * radius;
      
      const particle = this.scene.add.image(x, y, 'particle');
      particles.add(particle);
      
      particle.setTint(0xffaa00);
      particle.setScale(0.3);
      particle.setBlendMode(Phaser.BlendModes.ADD);
      particle.setAlpha(0.6);
      
      this.scene.tweens.add({
        targets: particle,
        angle: 360,
        duration: 1000,
        repeat: -1
      });
    }
    
    // Create charging ring
    const drawChargeRing = () => {
      graphics.clear();
      graphics.lineStyle(2, 0xffaa00, 0.8);
      graphics.beginPath();
      graphics.arc(config.x, config.y, radius, 0, Math.PI * 2 * config.progress);
      graphics.strokePath();
    };
    
    drawChargeRing();
    
    // Update the ring as charge progresses
    this.scene.tweens.add({
      targets: {},
      duration: 100,
      repeat: -1,
      onUpdate: drawChargeRing,
      onComplete: () => {
        if (config.onComplete) config.onComplete();
      }
    });
  }

  private createPiercingCharge(particles: Phaser.GameObjects.Group, graphics: Phaser.GameObjects.Graphics, config: ChargeConfig): void {
    // Create focusing particles
    const numParticles = 12;
    const maxRadius = 50;
    
    for (let i = 0; i < numParticles; i++) {
      const angle = (i / numParticles) * Math.PI * 2;
      const radius = maxRadius * (1 - config.progress);
      const x = config.x + Math.cos(angle) * radius;
      const y = config.y + Math.sin(angle) * radius;
      
      const particle = this.scene.add.image(x, y, 'particle');
      particles.add(particle);
      
      particle.setTint(0x00ffff);
      particle.setScale(0.3);
      particle.setBlendMode(Phaser.BlendModes.ADD);
      particle.setAlpha(0.6);
      
      // Particles converge to center as charge progresses
      this.scene.tweens.add({
        targets: particle,
        x: config.x,
        y: config.y,
        scaleX: 0.1,
        scaleY: 0.1,
        alpha: 0,
        duration: 500,
        repeat: -1
      });
    }
    
    // Create focusing lines
    const drawFocusLines = () => {
      graphics.clear();
      graphics.lineStyle(2, 0x00ffff, 0.6);
      
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const startRadius = maxRadius * (1 - config.progress);
        const endRadius = maxRadius * 0.2;
        
        graphics.beginPath();
        graphics.moveTo(
          config.x + Math.cos(angle) * startRadius,
          config.y + Math.sin(angle) * startRadius
        );
        graphics.lineTo(
          config.x + Math.cos(angle) * endRadius,
          config.y + Math.sin(angle) * endRadius
        );
        graphics.strokePath();
      }
    };
    
    drawFocusLines();
    
    this.scene.tweens.add({
      targets: {},
      duration: 100,
      repeat: -1,
      onUpdate: drawFocusLines,
      onComplete: () => {
        if (config.onComplete) config.onComplete();
      }
    });
  }

  private createMultishotCharge(particles: Phaser.GameObjects.Group, graphics: Phaser.GameObjects.Graphics, config: ChargeConfig): void {
    // Create spreading particles
    const numParticles = 15;
    const radius = 40;
    
    for (let i = 0; i < numParticles; i++) {
      const angle = ((i / numParticles) - 0.5) * Math.PI; // -90 to 90 degrees
      const x = config.x + Math.cos(angle) * radius * config.progress;
      const y = config.y + Math.sin(angle) * radius * config.progress;
      
      const particle = this.scene.add.image(x, y, 'particle');
      particles.add(particle);
      
      particle.setTint(0xff00ff);
      particle.setScale(0.25);
      particle.setBlendMode(Phaser.BlendModes.ADD);
      particle.setAlpha(0.6);
      
      // Particles pulse and spread
      this.scene.tweens.add({
        targets: particle,
        scaleX: 0.35,
        scaleY: 0.35,
        alpha: 0.8,
        duration: 400,
        yoyo: true,
        repeat: -1
      });
    }
    
    // Create spread indicator
    const drawSpreadIndicator = () => {
      graphics.clear();
      graphics.lineStyle(2, 0xff00ff, 0.6);
      
      // Draw spread arc
      const spreadAngle = Math.PI * 0.5 * config.progress;
      graphics.beginPath();
      graphics.arc(config.x, config.y, radius, -spreadAngle, spreadAngle);
      graphics.strokePath();
      
      // Draw direction lines
      graphics.lineStyle(1, 0xff00ff, 0.4);
      graphics.beginPath();
      graphics.moveTo(config.x, config.y);
      graphics.lineTo(
        config.x + Math.cos(-spreadAngle) * radius,
        config.y + Math.sin(-spreadAngle) * radius
      );
      graphics.moveTo(config.x, config.y);
      graphics.lineTo(
        config.x + Math.cos(spreadAngle) * radius,
        config.y + Math.sin(spreadAngle) * radius
      );
      graphics.strokePath();
    };
    
    drawSpreadIndicator();
    
    this.scene.tweens.add({
      targets: {},
      duration: 100,
      repeat: -1,
      onUpdate: drawSpreadIndicator,
      onComplete: () => {
        if (config.onComplete) config.onComplete();
      }
    });
  }

  private createOverchargeCharge(particles: Phaser.GameObjects.Group, graphics: Phaser.GameObjects.Graphics, config: ChargeConfig): void {
    // Create pulsing particles
    const numParticles = 20;
    const maxRadius = 60;
    
    for (let i = 0; i < numParticles; i++) {
      const angle = (i / numParticles) * Math.PI * 2;
      const radius = maxRadius * Math.random() * config.progress;
      const x = config.x + Math.cos(angle) * radius;
      const y = config.y + Math.sin(angle) * radius;
      
      const particle = this.scene.add.image(x, y, 'particle');
      particles.add(particle);
      
      particle.setTint(0xff0000);
      particle.setScale(0.4);
      particle.setBlendMode(Phaser.BlendModes.ADD);
      particle.setAlpha(0.7);
      
      // Particles pulse and orbit
      this.scene.tweens.add({
        targets: particle,
        scaleX: 0.6,
        scaleY: 0.6,
        alpha: 0.9,
        duration: 300 + Math.random() * 200,
        yoyo: true,
        repeat: -1
      });
      
      this.scene.tweens.add({
        targets: particle,
        angle: 360,
        duration: 2000 + Math.random() * 1000,
        repeat: -1
      });
    }
    
    // Create energy buildup effect
    const drawEnergyBuildup = () => {
      graphics.clear();
      
      // Inner circle
      graphics.lineStyle(3, 0xff3300, 0.8);
      graphics.beginPath();
      graphics.arc(config.x, config.y, maxRadius * 0.4, 0, Math.PI * 2);
      graphics.strokePath();
      
      // Outer circle
      graphics.lineStyle(2, 0xff0000, 0.6);
      graphics.beginPath();
      graphics.arc(config.x, config.y, maxRadius * config.progress, 0, Math.PI * 2);
      graphics.strokePath();
      
      // Energy spikes
      const numSpikes = Math.floor(12 * config.progress);
      for (let i = 0; i < numSpikes; i++) {
        const angle = (i / numSpikes) * Math.PI * 2;
        const innerRadius = maxRadius * 0.4;
        const outerRadius = maxRadius * (0.6 + 0.4 * Math.random()) * config.progress;
        
        graphics.lineStyle(1, 0xff3300, 0.5);
        graphics.beginPath();
        graphics.moveTo(
          config.x + Math.cos(angle) * innerRadius,
          config.y + Math.sin(angle) * innerRadius
        );
        graphics.lineTo(
          config.x + Math.cos(angle) * outerRadius,
          config.y + Math.sin(angle) * outerRadius
        );
        graphics.strokePath();
      }
    };
    
    drawEnergyBuildup();
    
    this.scene.tweens.add({
      targets: {},
      duration: 100,
      repeat: -1,
      onUpdate: drawEnergyBuildup,
      onComplete: () => {
        if (config.onComplete) config.onComplete();
      }
    });
  }

  private createTeslaCharge(particles: Phaser.GameObjects.Group, graphics: Phaser.GameObjects.Graphics, config: ChargeConfig): void {
    // Create electric particles
    const numParticles = 16;
    const radius = 45;
    
    for (let i = 0; i < numParticles; i++) {
      const angle = (i / numParticles) * Math.PI * 2;
      const x = config.x + Math.cos(angle) * radius * config.progress;
      const y = config.y + Math.sin(angle) * radius * config.progress;
      
      const particle = this.scene.add.image(x, y, 'particle');
      particles.add(particle);
      
      particle.setTint(0x4444ff);
      particle.setScale(0.3);
      particle.setBlendMode(Phaser.BlendModes.ADD);
      particle.setAlpha(0.6);
      
      // Particles flicker and orbit
      this.scene.tweens.add({
        targets: particle,
        alpha: 0.2,
        duration: 100 + Math.random() * 100,
        yoyo: true,
        repeat: -1
      });
    }
    
    // Create electric field effect
    const drawElectricField = () => {
      graphics.clear();
      
      // Draw electric arcs
      const numArcs = Math.floor(6 * config.progress);
      for (let i = 0; i < numArcs; i++) {
        const startAngle = Math.random() * Math.PI * 2;
        const arcLength = (Math.PI * 0.5) * Math.random();
        const arcRadius = radius * (0.8 + 0.2 * Math.random());
        
        graphics.lineStyle(1, 0x6666ff, 0.6);
        graphics.beginPath();
        graphics.arc(config.x, config.y, arcRadius, startAngle, startAngle + arcLength);
        graphics.strokePath();
        
        // Add small branches
        const branchStart = startAngle + arcLength * Math.random();
        const branchLength = radius * 0.3;
        const branchAngle = Math.random() * Math.PI * 0.5 - Math.PI * 0.25;
        
        graphics.beginPath();
        graphics.moveTo(
          config.x + Math.cos(branchStart) * arcRadius,
          config.y + Math.sin(branchStart) * arcRadius
        );
        graphics.lineTo(
          config.x + Math.cos(branchStart) * arcRadius + Math.cos(branchStart + branchAngle) * branchLength,
          config.y + Math.sin(branchStart) * arcRadius + Math.sin(branchStart + branchAngle) * branchLength
        );
        graphics.strokePath();
      }
      
      // Draw energy core
      graphics.lineStyle(2, 0x4444ff, 0.8);
      graphics.beginPath();
      graphics.arc(config.x, config.y, radius * 0.3, 0, Math.PI * 2);
      graphics.strokePath();
    };
    
    drawElectricField();
    
    this.scene.tweens.add({
      targets: {},
      duration: 100,
      repeat: -1,
      onUpdate: drawElectricField,
      onComplete: () => {
        if (config.onComplete) config.onComplete();
      }
    });
  }

  private createRapidFireCursor(particles: Phaser.GameObjects.Group, graphics: Phaser.GameObjects.Graphics, config: CursorConfig): void {
    const range = config.range || 100;
    const angle = config.angle || 0;
    const powerLevel = config.powerLevel || 0;
    const isUpgraded = config.isUpgraded || false;
    
    // Create range circle with power level indicator
    graphics.lineStyle(1, 0xffaa00, 0.2);
    graphics.beginPath();
    graphics.arc(config.x, config.y, range, 0, Math.PI * 2);
    graphics.strokePath();
    
    // Draw power level arc
    graphics.lineStyle(2, isUpgraded ? 0xffff00 : 0xffaa00, 0.6);
    graphics.beginPath();
    graphics.arc(config.x, config.y, range, 0, Math.PI * 2 * powerLevel);
    graphics.strokePath();
    
    // Add power level text
    const powerText = this.scene.add.text(config.x, config.y - range - 20, 
      `${Math.round(powerLevel * 100)}%`, 
      {
        fontSize: '16px',
        color: isUpgraded ? '#ffff00' : '#ffaa00',
        fontFamily: 'Arial',
        stroke: '#000000',
        strokeThickness: 4
      }
    );
    particles.add(powerText);
    powerText.setOrigin(0.5);
    powerText.setBlendMode(Phaser.BlendModes.ADD);
    
    // Pulse text with power level
    this.scene.tweens.add({
      targets: powerText,
      scaleX: 1 + (powerLevel * 0.2),
      scaleY: 1 + (powerLevel * 0.2),
      alpha: 0.8 + (powerLevel * 0.2),
      duration: 300 - (powerLevel * 50),
      yoyo: true,
      repeat: -1
    });

    // Create range markers with power level
    for (let i = 0; i < 4; i++) {
      const markerAngle = (i * Math.PI / 2) + (angle * Math.PI / 180);
      const markerOpacity = 0.4 + (powerLevel * 0.3);
      graphics.lineStyle(1, isUpgraded ? 0xffff00 : 0xffaa00, markerOpacity);
      graphics.beginPath();
      graphics.moveTo(
        config.x + Math.cos(markerAngle) * (range - 5),
        config.y + Math.sin(markerAngle) * (range - 5)
      );
      graphics.lineTo(
        config.x + Math.cos(markerAngle) * range,
        config.y + Math.sin(markerAngle) * range
      );
      graphics.strokePath();
    }
    
    // Create aim line with power level
    graphics.lineStyle(2, isUpgraded ? 0xffff00 : 0xffaa00, 0.6 + (powerLevel * 0.4));
    graphics.beginPath();
    graphics.moveTo(config.x, config.y);
    graphics.lineTo(
      config.x + Math.cos(angle * Math.PI / 180) * range,
      config.y + Math.sin(angle * Math.PI / 180) * range
    );
    graphics.strokePath();
    
    // Create aim point with power level
    const aimPoint = this.scene.add.image(
      config.x + Math.cos(angle * Math.PI / 180) * range,
      config.y + Math.sin(angle * Math.PI / 180) * range,
      'particle'
    );
    particles.add(aimPoint);
    
    aimPoint.setTint(isUpgraded ? 0xffff00 : 0xffaa00);
    aimPoint.setScale(0.3 + (powerLevel * 0.2));
    aimPoint.setBlendMode(Phaser.BlendModes.ADD);
    
    // Pulse effect with power level
    this.scene.tweens.add({
      targets: aimPoint,
      scaleX: 0.5 + (powerLevel * 0.3),
      scaleY: 0.5 + (powerLevel * 0.3),
      alpha: 0.8 + (powerLevel * 0.2),
      duration: 300 - (powerLevel * 50),
      yoyo: true,
      repeat: -1
    });
  }

  private createPiercingCursor(particles: Phaser.GameObjects.Group, graphics: Phaser.GameObjects.Graphics, config: CursorConfig): void {
    const range = config.range || 150;
    const angle = config.angle || 0;
    const powerLevel = config.powerLevel || 0;
    const isUpgraded = config.isUpgraded || false;
    
    // Create range circle with power level indicator
    graphics.lineStyle(1, 0x00ffff, 0.15);
    graphics.beginPath();
    graphics.arc(config.x, config.y, range, 0, Math.PI * 2);
    graphics.strokePath();
    
    // Draw power level arc
    graphics.lineStyle(2, isUpgraded ? 0x00ffff : 0x00cccc, 0.6);
    graphics.beginPath();
    graphics.arc(config.x, config.y, range, 0, Math.PI * 2 * powerLevel);
    graphics.strokePath();
    
    // Add power level text
    const powerText = this.scene.add.text(config.x, config.y - range - 20, 
      `${Math.round(powerLevel * 100)}%`, 
      {
        fontSize: '16px',
        color: isUpgraded ? '#00ffff' : '#00cccc',
        fontFamily: 'Arial',
        stroke: '#000000',
        strokeThickness: 4
      }
    );
    particles.add(powerText);
    powerText.setOrigin(0.5);
    powerText.setBlendMode(Phaser.BlendModes.ADD);
    
    // Pulse text with power level
    this.scene.tweens.add({
      targets: powerText,
      scaleX: 1 + (powerLevel * 0.2),
      scaleY: 1 + (powerLevel * 0.2),
      alpha: 0.8 + (powerLevel * 0.2),
      duration: 200 - (powerLevel * 30),
      yoyo: true,
      repeat: -1
    });

    // Create range markers with power level
    for (let i = 0; i < 8; i++) {
      const markerAngle = (i * Math.PI / 4) + (angle * Math.PI / 180);
      const markerOpacity = 0.3 + (powerLevel * 0.4);
      graphics.lineStyle(1, isUpgraded ? 0x00ffff : 0x00cccc, markerOpacity);
      graphics.beginPath();
      graphics.moveTo(
        config.x + Math.cos(markerAngle) * (range - 8),
        config.y + Math.sin(markerAngle) * (range - 8)
      );
      graphics.lineTo(
        config.x + Math.cos(markerAngle) * range,
        config.y + Math.sin(markerAngle) * range
      );
      graphics.strokePath();
    }
    
    // Create focused aim line with power level
    graphics.lineStyle(2, isUpgraded ? 0x00ffff : 0x00cccc, 0.8 + (powerLevel * 0.2));
    graphics.beginPath();
    graphics.moveTo(config.x, config.y);
    graphics.lineTo(
      config.x + Math.cos(angle * Math.PI / 180) * range,
      config.y + Math.sin(angle * Math.PI / 180) * range
    );
    graphics.strokePath();
    
    // Create focus point with power level
    const focusPoint = this.scene.add.image(
      config.x + Math.cos(angle * Math.PI / 180) * range,
      config.y + Math.sin(angle * Math.PI / 180) * range,
      'particle'
    );
    particles.add(focusPoint);
    
    focusPoint.setTint(isUpgraded ? 0x00ffff : 0x00cccc);
    focusPoint.setScale(0.4 + (powerLevel * 0.3));
    focusPoint.setBlendMode(Phaser.BlendModes.ADD);
    
    // Create focus ring with power level
    graphics.lineStyle(1, isUpgraded ? 0x00ffff : 0x00cccc, 0.4 + (powerLevel * 0.3));
    graphics.beginPath();
    graphics.arc(
      config.x + Math.cos(angle * Math.PI / 180) * range,
      config.y + Math.sin(angle * Math.PI / 180) * range,
      5 + (powerLevel * 3),
      0,
      Math.PI * 2
    );
    graphics.strokePath();
    
    // Pulse effect with power level
    this.scene.tweens.add({
      targets: focusPoint,
      scaleX: 0.6 + (powerLevel * 0.4),
      scaleY: 0.6 + (powerLevel * 0.4),
      alpha: 0.9 + (powerLevel * 0.1),
      duration: 200 - (powerLevel * 30),
      yoyo: true,
      repeat: -1
    });
  }

  private createMultishotCursor(particles: Phaser.GameObjects.Group, graphics: Phaser.GameObjects.Graphics, config: CursorConfig): void {
    const range = config.range || 120;
    const angle = config.angle || 0;
    const spread = config.spread || 30;
    const powerLevel = config.powerLevel || 0;
    const isUpgraded = config.isUpgraded || false;
    
    // Create range circle with power level indicator
    graphics.lineStyle(1, 0xff00ff, 0.15);
    graphics.beginPath();
    graphics.arc(config.x, config.y, range, 0, Math.PI * 2);
    graphics.strokePath();
    
    // Draw power level arc
    graphics.lineStyle(2, isUpgraded ? 0xff66ff : 0xff00ff, 0.6);
    graphics.beginPath();
    graphics.arc(config.x, config.y, range, 0, Math.PI * 2 * powerLevel);
    graphics.strokePath();
    
    // Add power level text
    const powerText = this.scene.add.text(config.x, config.y - range - 20, 
      `${Math.round(powerLevel * 100)}%`, 
      {
        fontSize: '16px',
        color: isUpgraded ? '#ff66ff' : '#ff00ff',
        fontFamily: 'Arial',
        stroke: '#000000',
        strokeThickness: 4
      }
    );
    particles.add(powerText);
    powerText.setOrigin(0.5);
    powerText.setBlendMode(Phaser.BlendModes.ADD);
    
    // Pulse text with power level
    this.scene.tweens.add({
      targets: powerText,
      scaleX: 1 + (powerLevel * 0.2),
      scaleY: 1 + (powerLevel * 0.2),
      alpha: 0.8 + (powerLevel * 0.2),
      duration: 300 - (powerLevel * 50),
      yoyo: true,
      repeat: -1
    });

    // Create range markers with power level
    for (let i = 0; i < 6; i++) {
      const markerAngle = (i * Math.PI / 3) + (angle * Math.PI / 180);
      const markerOpacity = 0.3 + (powerLevel * 0.4);
      graphics.lineStyle(1, isUpgraded ? 0xff66ff : 0xff00ff, markerOpacity);
      graphics.beginPath();
      graphics.moveTo(
        config.x + Math.cos(markerAngle) * (range - 6),
        config.y + Math.sin(markerAngle) * (range - 6)
      );
      graphics.lineTo(
        config.x + Math.cos(markerAngle) * range,
        config.y + Math.sin(markerAngle) * range
      );
      graphics.strokePath();
    }
    
    // Create spread lines with power level
    graphics.lineStyle(2, isUpgraded ? 0xff66ff : 0xff00ff, 0.6 + (powerLevel * 0.3));
    
    // Left spread line
    graphics.beginPath();
    graphics.moveTo(config.x, config.y);
    graphics.lineTo(
      config.x + Math.cos((angle - spread/2) * Math.PI / 180) * range,
      config.y + Math.sin((angle - spread/2) * Math.PI / 180) * range
    );
    graphics.strokePath();
    
    // Right spread line
    graphics.beginPath();
    graphics.moveTo(config.x, config.y);
    graphics.lineTo(
      config.x + Math.cos((angle + spread/2) * Math.PI / 180) * range,
      config.y + Math.sin((angle + spread/2) * Math.PI / 180) * range
    );
    graphics.strokePath();
    
    // Create spread arc with power level
    graphics.lineStyle(1, isUpgraded ? 0xff66ff : 0xff00ff, 0.4 + (powerLevel * 0.3));
    graphics.beginPath();
    graphics.arc(config.x, config.y, range, 
      (angle - spread/2) * Math.PI / 180,
      (angle + spread/2) * Math.PI / 180
    );
    graphics.strokePath();
    
    // Create spread indicators with power level
    for (let i = -1; i <= 1; i++) {
      const spreadAngle = angle + (i * spread/2);
      const indicator = this.scene.add.image(
        config.x + Math.cos(spreadAngle * Math.PI / 180) * range,
        config.y + Math.sin(spreadAngle * Math.PI / 180) * range,
        'particle'
      );
      particles.add(indicator);
      
      indicator.setTint(isUpgraded ? 0xff66ff : 0xff00ff);
      indicator.setScale(0.25 + (powerLevel * 0.15));
      indicator.setBlendMode(Phaser.BlendModes.ADD);
      
      // Pulse effect with power level
      this.scene.tweens.add({
        targets: indicator,
        scaleX: 0.35 + (powerLevel * 0.2),
        scaleY: 0.35 + (powerLevel * 0.2),
        alpha: 0.8 + (powerLevel * 0.2),
        duration: 300 - (powerLevel * 50),
        yoyo: true,
        repeat: -1
      });
    }
  }

  private createOverchargeCursor(particles: Phaser.GameObjects.Group, graphics: Phaser.GameObjects.Graphics, config: CursorConfig): void {
    const range = config.range || 80;
    const angle = config.angle || 0;
    const powerLevel = config.powerLevel || 0;
    const isUpgraded = config.isUpgraded || false;
    
    // Create range circle with power level indicator
    graphics.lineStyle(1, 0xff0000, 0.15);
    graphics.beginPath();
    graphics.arc(config.x, config.y, range, 0, Math.PI * 2);
    graphics.strokePath();
    
    // Draw power level arc
    graphics.lineStyle(2, isUpgraded ? 0xff6600 : 0xff0000, 0.6);
    graphics.beginPath();
    graphics.arc(config.x, config.y, range, 0, Math.PI * 2 * powerLevel);
    graphics.strokePath();
    
    // Add power level text
    const powerText = this.scene.add.text(config.x, config.y - range - 20, 
      `${Math.round(powerLevel * 100)}%`, 
      {
        fontSize: '16px',
        color: isUpgraded ? '#ff6600' : '#ff0000',
        fontFamily: 'Arial',
        stroke: '#000000',
        strokeThickness: 4
      }
    );
    particles.add(powerText);
    powerText.setOrigin(0.5);
    powerText.setBlendMode(Phaser.BlendModes.ADD);
    
    // Pulse text with power level
    this.scene.tweens.add({
      targets: powerText,
      scaleX: 1 + (powerLevel * 0.2),
      scaleY: 1 + (powerLevel * 0.2),
      alpha: 0.8 + (powerLevel * 0.2),
      duration: 200 - (powerLevel * 30),
      yoyo: true,
      repeat: -1
    });

    // Create range markers with power level
    for (let i = 0; i < 12; i++) {
      const markerAngle = (i * Math.PI / 6) + (angle * Math.PI / 180);
      const markerOpacity = 0.3 + (powerLevel * 0.4);
      graphics.lineStyle(1, isUpgraded ? 0xff6600 : 0xff0000, markerOpacity);
      graphics.beginPath();
      graphics.moveTo(
        config.x + Math.cos(markerAngle) * (range - 4),
        config.y + Math.sin(markerAngle) * (range - 4)
      );
      graphics.lineTo(
        config.x + Math.cos(markerAngle) * range,
        config.y + Math.sin(markerAngle) * range
      );
      graphics.strokePath();
    }
    
    // Create aim line with power level
    graphics.lineStyle(2, isUpgraded ? 0xff6600 : 0xff0000, 0.8 + (powerLevel * 0.2));
    graphics.beginPath();
    graphics.moveTo(config.x, config.y);
    graphics.lineTo(
      config.x + Math.cos(angle * Math.PI / 180) * range,
      config.y + Math.sin(angle * Math.PI / 180) * range
    );
    graphics.strokePath();
    
    // Create target circle with power level
    graphics.lineStyle(2, isUpgraded ? 0xff6600 : 0xff3300, 0.6 + (powerLevel * 0.3));
    graphics.beginPath();
    graphics.arc(
      config.x + Math.cos(angle * Math.PI / 180) * range,
      config.y + Math.sin(angle * Math.PI / 180) * range,
      10 + (powerLevel * 5),
      0,
      Math.PI * 2
    );
    graphics.strokePath();
    
    // Create energy particles with power level
    for (let i = 0; i < 4; i++) {
      const particle = this.scene.add.image(
        config.x + Math.cos(angle * Math.PI / 180) * range,
        config.y + Math.sin(angle * Math.PI / 180) * range,
        'particle'
      );
      particles.add(particle);
      
      particle.setTint(isUpgraded ? 0xff6600 : 0xff0000);
      particle.setScale(0.3 + (powerLevel * 0.2));
      particle.setBlendMode(Phaser.BlendModes.ADD);
      
      // Orbit effect with power level
      const orbitRadius = 5 + (powerLevel * 3);
      const orbitSpeed = 1000 + i * 200 - (powerLevel * 100);
      
      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(i * Math.PI / 2) * orbitRadius,
        y: particle.y + Math.sin(i * Math.PI / 2) * orbitRadius,
        duration: orbitSpeed,
        repeat: -1,
        ease: 'Linear'
      });
    }
  }

  private createTeslaCursor(particles: Phaser.GameObjects.Group, graphics: Phaser.GameObjects.Graphics, config: CursorConfig): void {
    const range = config.range || 130;
    const angle = config.angle || 0;
    const powerLevel = config.powerLevel || 0;
    const isUpgraded = config.isUpgraded || false;
    
    // Create range circle with power level indicator
    graphics.lineStyle(1, 0x4444ff, 0.15);
    graphics.beginPath();
    graphics.arc(config.x, config.y, range, 0, Math.PI * 2);
    graphics.strokePath();
    
    // Draw power level arc
    graphics.lineStyle(2, isUpgraded ? 0x6666ff : 0x4444ff, 0.6);
    graphics.beginPath();
    graphics.arc(config.x, config.y, range, 0, Math.PI * 2 * powerLevel);
    graphics.strokePath();
    
    // Add power level text
    const powerText = this.scene.add.text(config.x, config.y - range - 20, 
      `${Math.round(powerLevel * 100)}%`, 
      {
        fontSize: '16px',
        color: isUpgraded ? '#6666ff' : '#4444ff',
        fontFamily: 'Arial',
        stroke: '#000000',
        strokeThickness: 4
      }
    );
    particles.add(powerText);
    powerText.setOrigin(0.5);
    powerText.setBlendMode(Phaser.BlendModes.ADD);
    
    // Flicker text with power level
    this.scene.tweens.add({
      targets: powerText,
      alpha: 0.4 + (powerLevel * 0.6),
      duration: 100 + Math.random() * 100 - (powerLevel * 30),
      yoyo: true,
      repeat: -1
    });

    // Create range markers with power level
    for (let i = 0; i < 8; i++) {
      const markerAngle = (i * Math.PI / 4) + (angle * Math.PI / 180);
      const markerOpacity = 0.3 + (powerLevel * 0.4);
      graphics.lineStyle(1, isUpgraded ? 0x6666ff : 0x4444ff, markerOpacity);
      graphics.beginPath();
      graphics.moveTo(
        config.x + Math.cos(markerAngle) * (range - 7),
        config.y + Math.sin(markerAngle) * (range - 7)
      );
      graphics.lineTo(
        config.x + Math.cos(markerAngle) * range,
        config.y + Math.sin(markerAngle) * range
      );
      graphics.strokePath();
    }
    
    // Create aim line with power level
    graphics.lineStyle(2, isUpgraded ? 0x6666ff : 0x4444ff, 0.8 + (powerLevel * 0.2));
    graphics.beginPath();
    graphics.moveTo(config.x, config.y);
    graphics.lineTo(
      config.x + Math.cos(angle * Math.PI / 180) * range,
      config.y + Math.sin(angle * Math.PI / 180) * range
    );
    graphics.strokePath();
    
    // Create electric field with power level
    const targetX = config.x + Math.cos(angle * Math.PI / 180) * range;
    const targetY = config.y + Math.sin(angle * Math.PI / 180) * range;
    
    // Draw electric arcs with power level
    const numArcs = 3 + Math.floor(powerLevel * 2);
    for (let i = 0; i < numArcs; i++) {
      const startAngle = Math.random() * Math.PI * 2;
      const arcLength = (Math.PI * 0.5) * Math.random();
      const arcRadius = 8 * (0.8 + 0.2 * Math.random()) * (1 + powerLevel * 0.5);
      
      graphics.lineStyle(1, isUpgraded ? 0x6666ff : 0x4444ff, 0.6 + (powerLevel * 0.3));
      graphics.beginPath();
      graphics.arc(targetX, targetY, arcRadius, startAngle, startAngle + arcLength);
      graphics.strokePath();
    }
    
    // Create target point with power level
    const targetPoint = this.scene.add.image(targetX, targetY, 'particle');
    particles.add(targetPoint);
    
    targetPoint.setTint(isUpgraded ? 0x6666ff : 0x4444ff);
    targetPoint.setScale(0.3 + (powerLevel * 0.2));
    targetPoint.setBlendMode(Phaser.BlendModes.ADD);
    
    // Flicker effect with power level
    this.scene.tweens.add({
      targets: targetPoint,
      alpha: 0.2 + (powerLevel * 0.3),
      duration: 100 + Math.random() * 100 - (powerLevel * 30),
      yoyo: true,
      repeat: -1
    });
  }

  public destroy(): void {
    // Clean up all active effects
    this.activeEffects.forEach(group => {
      group.clear(true, true);
    });
    this.activeEffects = [];
    
    // Clean up charge effects
    this.activeChargeEffects.forEach(effect => {
      effect.group.clear(true, true);
      effect.graphics.destroy();
    });
    this.activeChargeEffects.clear();
    
    // Clean up cursor effects
    this.activeCursorEffects.forEach(effect => {
      effect.group.clear(true, true);
      effect.graphics.destroy();
    });
    this.activeCursorEffects.clear();
  }
} 