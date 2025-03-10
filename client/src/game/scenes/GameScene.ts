import Phaser from 'phaser';
import { BuildingSystem } from '../systems/BuildingSystem';
import { EnemySystem } from '../systems/EnemySystem';
import { WaveSystem } from '../systems/WaveSystem';
import { BuildingPanel } from '../ui/BuildingPanel';
import { ResourcePanel } from '../ui/ResourcePanel';
import { WavePanel } from '../ui/WavePanel';
import { TurretUI } from '../ui/TurretUI';
import ResourceManager from '../systems/ResourceManager';
import { TurretSystem } from '../systems/TurretSystem';

// We need to import Building type because it's used in the turretUI.selectBuilding method
// even though TypeScript doesn't detect it
import type { Building } from '../systems/BuildingSystem';

export class GameScene extends Phaser.Scene {
  private buildingSystem!: BuildingSystem;
  private enemySystem!: EnemySystem;
  private waveSystem!: WaveSystem;
  private resourceManager!: ResourceManager;
  private turretSystem!: TurretSystem;
  private buildingPanel!: BuildingPanel;
  private resourcePanel!: ResourcePanel;
  private wavePanel!: WavePanel;
  private turretUI!: TurretUI;
  private baseHealth: number = 100;
  private score: number = 0;
  private isPaused: boolean = false;
  private gameStartTime: number = 0;
  private selectedBuilding: string | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Create enemy paths
    const paths = this.createEnemyPaths();

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

    // Setup input handlers
    this.setupInputHandlers();

    // Start first wave
    this.waveSystem.startNextWave();

    // Initialize game start time
    this.gameStartTime = Date.now();
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
    this.input.on('pointerdown', () => {
      if (!this.input.activePointer.wasTouch && !this.input.activePointer.isDown) {
        this.deselectBuilding();
      }
    });

    // Handle ability activation
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.selectedBuilding) {
        const building = this.buildingSystem.getBuildings().get(this.selectedBuilding);
        if (building) {
          this.turretSystem.activateAbility(this.selectedBuilding);
        }
      }
    });
  }

  private selectBuilding(buildingId: string): void {
    const building = this.buildingSystem.getBuildings().get(buildingId);
    if (building) {
      this.selectedBuilding = buildingId;
      this.turretUI.selectBuilding(building);
    }
  }

  private deselectBuilding(): void {
    if (this.selectedBuilding) {
      this.selectedBuilding = null;
      this.turretUI.deselectBuilding();
    }
  }

  private createEnemyPaths(): Phaser.Curves.Path[] {
    const paths: Phaser.Curves.Path[] = [];
    
    // Path 1: From left to center
    const path1 = new Phaser.Curves.Path(0, 200);
    path1.lineTo(300, 200);
    path1.lineTo(300, 400);
    path1.lineTo(500, 400);
    paths.push(path1);

    // Path 2: From top to center
    const path2 = new Phaser.Curves.Path(400, 0);
    path2.lineTo(400, 300);
    path2.lineTo(500, 400);
    paths.push(path2);

    // Path 3: From right to center
    const path3 = new Phaser.Curves.Path(800, 300);
    path3.lineTo(600, 300);
    path3.lineTo(500, 400);
    paths.push(path3);

    return paths;
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
    // @ts-ignore - The TurretUI update method expects a time parameter
    this.turretUI.update(time);

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