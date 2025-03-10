import Phaser from 'phaser';

export const loadAbilitySounds = (scene: Phaser.Scene): void => {
  // Ability activation sounds
  scene.load.audio('rapid-fire-activate', 'assets/sounds/abilities/rapid-fire.mp3');
  scene.load.audio('piercing-activate', 'assets/sounds/abilities/piercing.mp3');
  scene.load.audio('multishot-activate', 'assets/sounds/abilities/multishot.mp3');
  scene.load.audio('overcharge-activate', 'assets/sounds/abilities/overcharge.mp3');
  scene.load.audio('overcharge-stack', 'assets/sounds/abilities/overcharge-stack.mp3');
  scene.load.audio('tesla-chain-activate', 'assets/sounds/abilities/tesla-chain.mp3');
  scene.load.audio('ability-activate', 'assets/sounds/abilities/generic-activate.mp3');
  
  // Cooldown complete sound
  scene.load.audio('ability-ready', 'assets/sounds/abilities/ready.mp3');
};

export const AbilitySoundConfig = {
  RAPID_FIRE: {
    volume: 0.5,
    rate: 1.0,
    detune: 0
  },
  PIERCING: {
    volume: 0.6,
    rate: 1.0,
    detune: 0
  },
  MULTISHOT: {
    volume: 0.5,
    rate: 1.0,
    detune: 0
  },
  OVERCHARGE: {
    volume: 0.7,
    rate: 1.0,
    detune: 0
  },
  OVERCHARGE_STACK: {
    volume: 0.3,
    rate: 1.0,
    detune: 0
  },
  TESLA_CHAIN: {
    volume: 0.6,
    rate: 1.0,
    detune: 100
  },
  GENERIC: {
    volume: 0.4,
    rate: 1.0,
    detune: 0
  },
  READY: {
    volume: 0.3,
    rate: 1.0,
    detune: 0
  }
}; 