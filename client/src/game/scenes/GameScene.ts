import Phaser from 'phaser';
import { BuildingSystem, Building } from '../systems/BuildingSystem';
import { EnemySystem } from '../systems/EnemySystem';
import { WaveSystem } from '../systems/WaveSystem';
import { BuildingPanel } from '../ui/BuildingPanel';
import { ResourcePanel } from '../ui/ResourcePanel';
import { WavePanel } from '../ui/WavePanel';
import { TurretUI } from '../ui/TurretUI';
import { TurretAbilityUI } from '../ui/TurretAbilityUI';
import ResourceManager from '../systems/ResourceManager';
import { TurretSystem } from '../systems/TurretSystem';

interface Resources {
  metal: number;
  energy: number;
  crystals: number;
  total: number;
}

interface WaveConfig {
  enemies: {
    type: string;
    count: number;
    delay: number;
  }[];
  reward: number;
}

interface GameSceneEvents extends Phaser.Events.EventEmitter {
  emit(event: 'buildingSelected', building: Building): boolean;
  emit(event: 'buildingDeselected'): boolean;
  emit(event: 'waveStart', data: { waveNumber: number; config: WaveConfig }): boolean;
  emit(event: 'waveComplete', data: { waveNumber: number; reward: Resources }): boolean;
  emit(event: 'allWavesComplete'): boolean;
  emit(event: 'enemyDefeated', reward: Resources): boolean;
  emit(event: 'enemyReachedEnd', damage: number): boolean;
  emit(event: 'baseHealthChanged', health: number): boolean;
  emit(event: 'gamePaused'): boolean;
  emit(event: 'gameResumed'): boolean;

  on(event: 'buildingSelected', fn: (building: Building) => void, context?: any): this;
  on(event: 'buildingDeselected', fn: () => void, context?: any): this;
  on(event: 'waveStart', fn: (data: { waveNumber: number; config: WaveConfig }) => void, context?: any): this;
  on(event: 'waveComplete', fn: (data: { waveNumber: number; reward: Resources }) => void, context?: any): this;
  on(event: 'allWavesComplete', fn: () => void, context?: any): this;
  on(event: 'enemyDefeated', fn: (reward: Resources) => void, context?: any): this;
  on(event: 'enemyReachedEnd', fn: (damage: number) => void, context?: any): this;
  on(event: 'baseHealthChanged', fn: (health: number) => void, context?: any): this;
  on(event: 'gamePaused', fn: () => void, context?: any): this;
  on(event: 'gameResumed', fn: () => void, context?: any): this;
}

export class GameScene extends Phaser.Scene {
  public enemySystem!: EnemySystem;
  private buildingSystem!: BuildingSystem;
  private waveSystem!: WaveSystem;
  private resourceManager!: ResourceManager;
  private turretSystem!: TurretSystem;
  private buildingPanel!: BuildingPanel;
  private resourcePanel!: ResourcePanel;
  private wavePanel!: WavePanel;
  private turretUI!: TurretUI;
  private turretAbilityUI!: TurretAbilityUI;
  private baseHealth: number = 100;
  private score: number = 0;
  private isPaused: boolean = false;
  private gameStartTime: number = 0;
  private selectedBuilding: string | null = null;

  public events!: GameSceneEvents;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Create enemy paths
    const paths = this.createEnemyPaths();

    // Initialize particle system for effects
    this.createParticleEffects();

    // Initialize systems
    this.enemySystem = new EnemySystem(this, paths);
    this.buildingSystem = new BuildingSystem(this);
    this.waveSystem = new WaveSystem(this, this.enemySystem);
    this.resourceManager = new ResourceManager(this);
    this.turretSystem = new TurretSystem(this);

    // Initialize UI
    this.buildingPanel = new BuildingPanel(this);
    this.resourcePanel = new ResourcePanel(this);
    this.wavePanel = new WavePanel(this, this.waveSystem);
    this.turretUI = new TurretUI(this);
    this.turretAbilityUI = new TurretAbilityUI(this);

    // Setup input handlers
    this.setupInputHandlers();
    this.setupEventListeners();

    // Start first wave
    this.waveSystem.startNextWave();

    // Initialize game start time
    this.gameStartTime = Date.now();
  }

  private createParticleEffects(): void {
    // Create particle for enemy death effect
    const particles = this.add.particles(0, 0, 'particle', {
      frame: 0,
      lifespan: 1000,
      speed: { min: 50, max: 100 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: 'ADD'
    });
    particles.setDepth(2);
    particles.stop();

    // Create particle for resource collection
    const resourceParticles = this.add.particles(0, 0, 'resource-particle', {
      frame: 0,
      lifespan: 800,
      speed: { min: 30, max: 60 },
      scale: { start: 0.3, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: 'ADD'
    });
    resourceParticles.setDepth(2);
    resourceParticles.stop();
  }

  private createEnemyPaths(): Phaser.Curves.Path[] {
    const paths: Phaser.Curves.Path[] = [];
    
    // Path 1: S-shaped curve
    const path1 = new Phaser.Curves.Path(0, 200);
    path1.cubicBezierTo(200, 100, 400, 300, 600, 200);
    path1.cubicBezierTo(800, 100, 1000, 300, 1200, 200);
    paths.push(path1);

    // Path 2: Wave pattern
    const path2 = new Phaser.Curves.Path(0, 400);
    for (let i = 0; i < 6; i++) {
      const xOffset = i * 200;
      path2.splineTo([
        new Phaser.Math.Vector2(xOffset + 50, 300),
        new Phaser.Math.Vector2(xOffset + 100, 500),
        new Phaser.Math.Vector2(xOffset + 200, 400)
      ]);
    }
    paths.push(path2);

    // Debug: Draw paths
    if (process.env.NODE_ENV === 'development') {
      const graphics = this.add.graphics();
      graphics.lineStyle(1, 0x00ff00, 0.3);
      paths.forEach(path => path.draw(graphics));
    }

    return paths;
  }

  private setupEventListeners(): void {
    // Wave events
    this.events.on('waveStart', (data: { waveNumber: number; config: WaveConfig }) => {
      this.wavePanel.updateWaveInfo(data.waveNumber);
    });

    this.events.on('waveComplete', (data: { waveNumber: number; reward: Resources }) => {
      this.score += data.reward.total;
      this.resourceManager.addResources(data.reward);
      this.wavePanel.showWaveComplete(data.waveNumber, data.reward.total);
    });

    this.events.on('allWavesComplete', () => {
      this.handleGameOver(true);
    });

    // Enemy events
    this.events.on('enemyDefeated', (reward: Resources) => {
      this.score += reward.total;
      this.resourceManager.addResources(reward);
    });

    this.events.on('enemyReachedEnd', (damage: number) => {
      this.baseHealth -= damage;
      this.events.emit('baseHealthChanged', this.baseHealth);

      // Visual feedback
      this.cameras.main.shake(200, 0.005);
      this.cameras.main.flash(100, 255, 0, 0);
    });
  }

  private setupInputHandlers(): void {
    // Handle building selection
    this.input.on('gameobjectdown', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      const building = this.buildingSystem.getBuildings().get(gameObject.getData('buildingId'));
      if (building) {
        if (this.selectedBuilding === building.id) {
          this.deselectBuilding();
        } else {
          this.selectBuilding(building.id);
        }
      }
    });

    // Handle deselection when clicking empty space
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.wasTouch && !this.input.activePointer.isDown) {
        this.deselectBuilding();
      }
    });

    // Handle ability activation
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.selectedBuilding) {
        this.turretSystem.activateAbility(this.selectedBuilding);
      }
    });

    // Handle pause
    this.input.keyboard?.on('keydown-P', () => {
      this.togglePause();
    });
  }

  private selectBuilding(buildingId: string): void {
    const building = this.buildingSystem.getBuildings().get(buildingId);
    if (building) {
      this.selectedBuilding = buildingId;
      this.turretUI.selectBuilding(building);
      this.events.emit('buildingSelected', building);
    }
  }

  private deselectBuilding(): void {
    if (this.selectedBuilding) {
      this.selectedBuilding = null;
      this.turretUI.deselectBuilding();
      this.events.emit('buildingDeselected');
    }
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.scene.pause();
      this.events.emit('gamePaused');
    } else {
      this.scene.resume();
      this.events.emit('gameResumed');
    }
  }

  update(time: number, delta: number): void {
    if (this.isPaused) return;

    // Update systems
    this.buildingSystem.update(delta);
    this.enemySystem.update(delta);
    this.waveSystem.update(delta);
    this.resourceManager.update(delta);
    this.turretSystem.update(time);

    // Update UI
    this.buildingPanel.update();
    this.resourcePanel.update();
    this.wavePanel.update();
    this.turretUI.update(time);
    this.turretAbilityUI.update(time);

    // Check for game over conditions
    if (this.baseHealth <= 0) {
      this.handleGameOver(false);
      return;
    }
    
    if (this.waveSystem.isWaveSetComplete() && this.enemySystem.getActiveEnemyCount() === 0) {
      this.handleGameOver(true);
      return;
    }
  }

  private handleGameOver(victory: boolean): void {
    const stats = {
      score: this.score,
      wavesCompleted: this.waveSystem.getCurrentWave() - 1,
      enemiesDefeated: this.enemySystem.getDefeatedCount(),
      buildingsPlaced: this.buildingSystem.getTotalBuildingsPlaced(),
      resourcesCollected: {
        metal: this.resourceManager.getCollectedAmount('metal'),
        energy: this.resourceManager.getCollectedAmount('energy'),
        crystals: this.resourceManager.getCollectedAmount('crystals')
      },
      timePlayed: Date.now() - this.gameStartTime
    };

    this.scene.start('GameOverScene', { stats, victory });
  }
} 