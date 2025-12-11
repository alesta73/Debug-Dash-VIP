import Phaser from 'phaser';
import { AnimationManager } from '../services/AnimationManager';
import { SCENE_KEYS } from './sceneKeys';
import { KNIGHT_ASSET_KEYS, PLAYER_ASSET_KEYS, SKY_BACKGROUND_ASSET_KEYS, TILESET_ASSET_KEYS } from '../assets/asset-keys';

export default class PreloadScene extends Phaser.Scene {
    constructor() {
        super(SCENE_KEYS.PRELOAD_SCENE);
    }
    preload() {
        const brackeys_asset_path = 'assets/brackeys_platformer_assets/';

        this.load.image(
            SKY_BACKGROUND_ASSET_KEYS.SKY, 'assets/sky.png');

        this.load.spritesheet(TILESET_ASSET_KEYS.TILESET, `${brackeys_asset_path}/sprites/tilesett.png`, {
            frameWidth: 16,
            frameHeight: 16
        });

        this.load.spritesheet(KNIGHT_ASSET_KEYS.KNIGHT, `${brackeys_asset_path}/sprites/knight.png`, {
            frameWidth: 32, frameHeight: 32
        });

        this.load.spritesheet(PLAYER_ASSET_KEYS.PLAYER, `${brackeys_asset_path}/sprites/player.png`, {
            frameWidth: 32, frameHeight: 32
        });
    }

    // Creates animations and starts the main game scene.
    create() {
        AnimationManager.createPlayerAnims(this.anims);
        AnimationManager.createKnightAnims(this.anims);

        this.scene.start('GameScene');
    }
}
