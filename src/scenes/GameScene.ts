import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { knight } from '../entities/Knight';
import { InputManager } from '../services/InputManager';
import { AMOK_TILESET_ASSET_KEYS, SKY_BACKGROUND_ASSET_KEYS, TILESET_ASSET_KEYS } from '../assets/asset-keys';

// The main game scene where gameplay occurs
export default class GameScene extends Phaser.Scene {
    private player!: Player;
    private knight!: knight;
    private platforms!: Phaser.Physics.Arcade.StaticGroup;
    private inputManager!: InputManager;
    fpsText: Phaser.GameObjects.Text;

    constructor() {
        super('GameScene');
    }

    // Creates game objects and initializes the scene
    create() {
        // Create background
        this.add.image(400, 300, SKY_BACKGROUND_ASSET_KEYS.SKY);

        // Create platforms
        this.platforms = this.physics.add.staticGroup();
        this.createPlatforms();

        // Initialize input manager
        this.inputManager = new InputManager(this);

        // Create player
        this.player = new Player(this, 10, 10, this.inputManager); 

        // create knight
        this.knight = new knight(this, 1, 1)

        // Apply physics to the player's sprite
        this.player.sprite.setBounce(0);
        this.player.sprite.setCollideWorldBounds(true);
        // this.player.sprite.body?.setSize(12, 18);
        // this.player.sprite.body?.setOffset(9, 10);
        this.player.sprite.body?.setSize(16, 16);
        this.player.sprite.body?.setOffset(0, 0);

        this.knight.sprite.setBounce(0);
        this.knight.sprite.setCollideWorldBounds(true);
        this.knight.sprite.body?.setSize(12, 18);
        this.knight.sprite.body?.setOffset(9, 10);

        // Add colliders
        this.physics.add.collider(this.player.sprite, this.platforms);
        this.physics.add.collider(this.knight.sprite, this.platforms)
        this.physics.add.collider(this.knight.sprite, this.player.sprite);


        this.fpsText = this.add.text(10, 10, 'FPS: 60', { fontSize: '10px', color: '#00ff00' }).setScrollFactor(0);
    }

    // Updates the scene every frame
    update(time: number, delta: number) {
        this.player.update(time, delta);
        this.knight.update(time, delta);
        const currentFPS = Math.round(1000 / delta);
        this.fpsText.setText(`FPS: ${currentFPS}`);
    }
        
    // Creates platform groups
    private createPlatforms() {
        // let grass_coords = 0;
        // for (let i = 0; i <= 21;  i++) {
        //     this.platforms.create(grass_coords, 172, TILESET_ASSET_KEYS.TILESET, 0); 
        //     grass_coords += 15;
        // }

         let brick_cords = 0; 
        for (let i = 0; i <= 10;  i++) {
            this.platforms.create(brick_cords, 172, AMOK_TILESET_ASSET_KEYS.BRICK, 'moss1'); 
            brick_cords += 16;
            this.platforms.create(brick_cords, 172, AMOK_TILESET_ASSET_KEYS.BRICK, 'moss2'); 
            brick_cords += 16;
            this.platforms.create(brick_cords, 172, AMOK_TILESET_ASSET_KEYS.BRICK, 'moss3'); 
            brick_cords += 16;
        }
        // grass_coords = 160;
        //   for (let i = 160; i <= 320; i++) {
        //     this.platforms.create(grass_coords, 200, TILESET_ASSET_KEYS.TILESET, 0); 
        //     grass_coords += 15;
        // }
    }
}