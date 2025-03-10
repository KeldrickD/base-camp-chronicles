import Phaser from 'phaser';

export const loadParticleAssets = (scene: Phaser.Scene): void => {
  // Load base particle texture
  scene.load.image('particle', 'assets/particles/particle.png');
  
  // Load special particle textures
  scene.load.image('spark', 'assets/particles/spark.png');
  scene.load.image('glow', 'assets/particles/glow.png');
  scene.load.image('trail', 'assets/particles/trail.png');
}; 