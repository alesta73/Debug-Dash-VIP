import Phaser from 'phaser';
import { AnimationManager } from '../services/AnimationManager';
import { SCENE_KEYS } from './sceneKeys';
import { AMOK_TILESET_ASSET_KEYS, KNIGHT_ASSET_KEYS, PLAYER_ASSET_KEYS, SKY_BACKGROUND_ASSET_KEYS, TILESET_ASSET_KEYS } from '../assets/asset-keys';

export default class PreloadScene extends Phaser.Scene {
    constructor() {
        super(SCENE_KEYS.PRELOAD_SCENE);
    }
    preload() {
        const amok_assets = 'assets/amok_textures/';
        const brackeys_asset_path = 'assets/brackeys_platformer_assets/';
        const custom_assets = 'assets/dd_custom/';

        this.load.image(
            SKY_BACKGROUND_ASSET_KEYS.SKY, 'assets/sky.png');
        
        this.load.spritesheet(AMOK_TILESET_ASSET_KEYS.BRICK, `${amok_assets}/sprites/Mossy_ground_test.png`, {
            frameWidth: 16,
            frameHeight: 16
        });

        this.load.spritesheet(TILESET_ASSET_KEYS.TILESET, `${brackeys_asset_path}/sprites/tilesett.png`, {
            frameWidth: 16,
            frameHeight: 16
        });

        this.load.spritesheet(KNIGHT_ASSET_KEYS.KNIGHT, `${brackeys_asset_path}/sprites/knight.png`, {
            frameWidth: 32, frameHeight: 32
        });

        // this.load.spritesheet(PLAYER_ASSET_KEYS.PLAYER, `${brackeys_asset_path}/sprites/player.png`, {
        //     frameWidth: 32, frameHeight: 32
        // });
        //  this.load.spritesheet(PLAYER_ASSET_KEYS.PLAYER, `${custom_assets}/Player_noOutline.png`, {
        //     frameWidth: 32, frameHeight: 32
        // });

          this.load.spritesheet(PLAYER_ASSET_KEYS.PLAYER, `${amok_assets}/sprites/amok_player.png`, {
            frameWidth: 16, frameHeight: 16
        });
    }

    // Creates animations and starts the main game scene.
    create() {
        AnimationManager.createPlayerAnims(this.anims);
        AnimationManager.createKnightAnims(this.anims);

        // Manually define a frame for the 4th block (no moss)
        // .add(frameName, sourceIndex, x, y, width, height)
        // The 4th block starts at x=48 (16 pixels * 3)
        this.textures.get(AMOK_TILESET_ASSET_KEYS.BRICK).add('moss1', 0, 0, 0, 16, 16);
        this.textures.get(AMOK_TILESET_ASSET_KEYS.BRICK).add('moss2', 0, 17, 0, 16, 16);
        this.textures.get(AMOK_TILESET_ASSET_KEYS.BRICK).add('moss3', 0, 33, 0, 16, 16);
        this.textures.get(AMOK_TILESET_ASSET_KEYS.BRICK).add('no-moss', 0, 48, 0, 16, 16);

        this.scene.start('GameScene');
    }
}
