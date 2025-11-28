import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Zombie } from '../entities/Zombie';
import { InputManager } from '../services/InputManager';

// The main game scene where gameplay occurs
export default class GameScene extends Phaser.Scene {
    private player!: Player;
    private zombie!: Zombie;
    private platforms!: Phaser.Physics.Arcade.StaticGroup;
    private inputManager!: InputManager;
    fpsText: Phaser.GameObjects.Text;

    constructor() {
        super('GameScene');
    }

    // Creates game objects and initializes the scene
    create() {
        // Create background
        this.add.image(400, 300, 'sky');

        // Create platforms
        this.platforms = this.physics.add.staticGroup();
        this.createPlatforms();

        // Initialize input manager
        this.inputManager = new InputManager(this);

        // Create player
        this.player = new Player(this, 10, 10, this.inputManager); 

        // create zombie
        this.zombie = new Zombie(this, 1, 1)

        // Apply physics to the player's sprite
        this.player.sprite.setBounce(0);
        this.player.sprite.setCollideWorldBounds(true);
        this.player.sprite.body?.setSize(12, 18);
        this.player.sprite.body?.setOffset(9, 10);

        this.zombie.sprite.setBounce(0);
        this.zombie.sprite.setCollideWorldBounds(true);
        this.zombie.sprite.body?.setSize(12, 18);
        this.zombie.sprite.body?.setOffset(9, 10);

        // Add colliders
        this.physics.add.collider(this.player.sprite, this.platforms);
        this.physics.add.collider(this.zombie.sprite, this.platforms)
        this.physics.add.collider(this.zombie.sprite, this.player.sprite);


        this.fpsText = this.add.text(10, 10, 'FPS: 60', { fontSize: '10px', color: '#00ff00' }).setScrollFactor(0);
    }

    // Updates the scene every frame
    update(time: number, delta: number) {
        this.player.update(time, delta);
        this.zombie.update(time, delta);
        const currentFPS = Math.round(1000 / delta);
        this.fpsText.setText(`FPS: ${currentFPS}`);
    }
        
    // Creates platform groups
    private createPlatforms() {
        let grass_coords = 0;
        for (let i = 0; i <= 21;  i++) {
            this.platforms.create(grass_coords, 172, 'tileset', 0); 
            grass_coords += 15;
        }
        grass_coords = 160;
          for (let i = 160; i <= 320; i++) {
            this.platforms.create(grass_coords, 200, 'tileset', 0); 
            grass_coords += 15;
        }
    }
}