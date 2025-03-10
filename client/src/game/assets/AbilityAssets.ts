import Phaser from 'phaser';

export enum AbilityType {
  RAPID_FIRE = 'rapidFire',
  PIERCING = 'piercing',
  MULTISHOT = 'multishot',
  OVERCHARGE = 'overcharge',
  TESLA_CHAIN = 'teslaChain'
}

interface AbilityAssetConfig {
  key: string;
  color: number;
  iconShape: (graphics: Phaser.GameObjects.Graphics) => void;
}

export const AbilityAssets: Record<AbilityType, AbilityAssetConfig> = {
  [AbilityType.RAPID_FIRE]: {
    key: 'ability-rapidFire',
    color: 0xffff00,
    iconShape: (graphics: Phaser.GameObjects.Graphics) => {
      // Three arrows in rapid succession
      graphics.lineStyle(3, 0xffff00);
      [-10, 0, 10].forEach(offset => {
        graphics.beginPath();
        graphics.moveTo(-5 + offset, -8);
        graphics.lineTo(5 + offset, 0);
        graphics.lineTo(-5 + offset, 8);
        graphics.strokePath();
      });
    }
  },
  [AbilityType.PIERCING]: {
    key: 'ability-piercing',
    color: 0xff0000,
    iconShape: (graphics: Phaser.GameObjects.Graphics) => {
      // Arrow piercing through a shield
      graphics.lineStyle(3, 0xff0000);
      // Arrow
      graphics.beginPath();
      graphics.moveTo(-12, 0);
      graphics.lineTo(12, 0);
      graphics.moveTo(8, -4);
      graphics.lineTo(12, 0);
      graphics.lineTo(8, 4);
      graphics.strokePath();
      // Shield (broken)
      graphics.lineStyle(2, 0xff0000, 0.7);
      graphics.arc(0, 0, 10, -Math.PI * 0.3, Math.PI * 0.3);
      graphics.arc(0, 0, 10, Math.PI * 0.7, Math.PI * 1.3);
    }
  },
  [AbilityType.MULTISHOT]: {
    key: 'ability-multishot',
    color: 0x00ffff,
    iconShape: (graphics: Phaser.GameObjects.Graphics) => {
      // Multiple arrows spreading out
      graphics.lineStyle(2, 0x00ffff);
      [-30, 0, 30].forEach(angle => {
        const rad = angle * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        graphics.beginPath();
        graphics.moveTo(-8 * cos, -8 * sin);
        graphics.lineTo(8 * cos, 8 * sin);
        graphics.moveTo(4 * cos - 4 * sin, 4 * sin + 4 * cos);
        graphics.lineTo(8 * cos, 8 * sin);
        graphics.lineTo(4 * cos + 4 * sin, 4 * sin - 4 * cos);
        graphics.strokePath();
      });
    }
  },
  [AbilityType.OVERCHARGE]: {
    key: 'ability-overcharge',
    color: 0xff00ff,
    iconShape: (graphics: Phaser.GameObjects.Graphics) => {
      // Lightning bolt with energy circle
      graphics.lineStyle(3, 0xff00ff);
      // Lightning bolt
      graphics.beginPath();
      graphics.moveTo(-5, -12);
      graphics.lineTo(2, -4);
      graphics.lineTo(-2, 0);
      graphics.lineTo(5, 12);
      graphics.strokePath();
      // Energy circle
      graphics.lineStyle(2, 0xff00ff, 0.7);
      graphics.beginPath();
      graphics.arc(0, 0, 10, 0, Math.PI * 2);
      graphics.strokePath();
    }
  },
  [AbilityType.TESLA_CHAIN]: {
    key: 'ability-teslaChain',
    color: 0x00ffff,
    iconShape: (graphics: Phaser.GameObjects.Graphics) => {
      // Multiple connected lightning bolts
      graphics.lineStyle(2, 0x00ffff);
      // Main bolt
      graphics.beginPath();
      graphics.moveTo(-10, -10);
      graphics.lineTo(-2, 0);
      graphics.lineTo(-8, 0);
      graphics.lineTo(0, 10);
      graphics.strokePath();
      // Chain effect
      graphics.lineStyle(2, 0x00ffff, 0.7);
      graphics.beginPath();
      graphics.moveTo(0, 10);
      graphics.lineTo(8, 5);
      graphics.lineTo(4, 5);
      graphics.lineTo(10, 0);
      graphics.strokePath();
    }
  }
}; 