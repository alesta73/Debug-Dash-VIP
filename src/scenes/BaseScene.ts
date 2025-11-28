import Phaser from "phaser";

import { CharacterMovementController } from "../controllers/CharacterMovementController";

// A base scene that can be extended by other scenes to share common functionality
export default class BaseScene extends Phaser.Scene {

    private platforms: Phaser.Physics.Arcade.StaticGroup;
    private player!: Phaser.Physics.Arcade.Sprite;
    private playerController!: CharacterMovementController;

    constructor() {
        super('test')
    }

    // Preloads game assets
    preload() {
        this.load.on('filecomplete', (key: string) => {
            if (key === 'platforms') {
                this.textures.get(key).setFilter(Phaser.Textures.NEAREST);
            }
        });

        // Load images and spritesheets
        this.load.image('sky', 'assets/sky.png')
        this.load.image('ground', 'assets/ground.png');
        this.load.image('star', 'assets/star.png');
        this.load.image('bomb', 'assets/bomb.png');
        this.load.spritesheet('tileset', 'assets/brackeys_platformer_assets/sprites/tilesett.png', {
            frameWidth: 16,
            frameHeight: 16
        });
        this.load.spritesheet('knight', 'assets/brackeys_platformer_assets/sprites/knight.png', {
            frameWidth: 32, frameHeight: 32
        });
    }

    // Creates game objects and initializes the scene
    create() {
        this.add.image(400, 300, 'sky');
        this.platforms = this.physics.add.staticGroup();

        // Create ground platforms
        let grass_coords = 0;
        for (let i = 0; i <= 320; i++) {
            this.platforms.create(grass_coords, 172, 'tileset', 0);
            grass_coords += 15;
        }

        // Create player
        this.player = this.physics.add.sprite(10, 10, 'knight', 0) as Phaser.Physics.Arcade.Sprite;
        this.player.setBounce(0.2);
        this.player.body?.setSize(12, 18);
        this.player.body?.setOffset(0, 10)
        this.player.setCollideWorldBounds(true);

        // Initialize player movement controller
        this.playerController = new CharacterMovementController(
            this,
            this.player,
            { speed: 130, jumpStrength: 200 }
        );

        this.createAnimations();
    }

    // Updates the scene every frame
    update() {
       this.playerController.update();
       this.physics.add.collider(this.player, this.platforms);
    }

    // Creates player animations
    private createAnimations() {
        this.anims.create({
            key: 'left',
            frames: this.anims.generateFrameNumbers('knight', { start: 16, end: 31 }),
            frameRate: 10,
            repeat: -1,
        });
        this.anims.create({
            key: 'right',
            frames: this.anims.generateFrameNumbers('knight', { start: 16, end: 31 }),
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'idle',
            frames: this.anims.generateFrameNumbers('knight', { start: 0, end: 3 }),
            frameRate: 4,
            repeat: -1
        });
    }
}
