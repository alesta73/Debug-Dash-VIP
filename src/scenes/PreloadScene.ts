import Phaser from 'phaser';
import { AnimationManager } from '../services/AnimationManager';

// This scene is responsible for preloading all game assets.
export default class PreloadScene extends Phaser.Scene {
    constructor() {
        super('PreloadScene');
    }

    // Preloads all necessary assets for the game.
    preload() {
        // Load images and spritesheets
        this.load.image('sky', 'assets/sky.png');
        this.load.image('platform', 'assets/platform.png');

        this.load.spritesheet('tileset', 'assets/brackeys_platformer_assets/sprites/tilesett.png', {
            frameWidth: 16,
            frameHeight: 16
        });


        this.load.spritesheet('knight', 'assets/brackeys_platformer_assets/sprites/knight.png', {
            frameWidth: 32, frameHeight: 32
        });

        this.load.spritesheet('player', 'assets/brackeys_platformer_assets/sprites/player.png', {
            frameWidth: 32, frameHeight: 32
        });
    }

    // Creates animations and starts the main game scene.
    create() {

        // Create animations for the player
        AnimationManager.createPlayerAnims(this.anims);

        // Start the main game scene
        this.scene.start('GameScene');
    }
}
