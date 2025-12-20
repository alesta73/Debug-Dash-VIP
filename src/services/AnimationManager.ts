import Phaser from "phaser";
import { KNIGHT_ASSET_KEYS, PLAYER_ASSET_KEYS } from "../assets/asset-keys";

// 1. Define the Interface (Reusable)
interface AnimConfig {
    key: string;
    start: number;
    end: number;
    frameRate: number;
    repeat?: number;
}

export class AnimationManager {
    
    // 2. The Generic Helper Method
    // This creates animations for ANY entity given a texture key and a config list
    private static createAnimationSet(
        anims: Phaser.Animations.AnimationManager,
        textureKey: string,
        configs: AnimConfig[]
    ) {
        configs.forEach((config) => {
            anims.create({
                key: config.key,
                frames: anims.generateFrameNumbers(textureKey, {
                    start: config.start,
                    end: config.end,
                }),
                frameRate: config.frameRate,
                repeat: config.repeat ?? 0,
            });
        });
    }

    // 3. Player Implementation (Data Only)
    static createPlayerAnims(anims: Phaser.Animations.AnimationManager) {
        this.createAnimationSet(anims, PLAYER_ASSET_KEYS.PLAYER, [
            {
                key: PLAYER_ASSET_KEYS.PLAYER_IDLE_ANIM,
                start: 0,
                end: 10,
                frameRate: 10,
                repeat: -1
            },
            // Add run, jump, attack here easily...
        ]);
    }

    // 4. Knight Implementation (Data Only)
    static createKnightAnims(anims: Phaser.Animations.AnimationManager) {
        this.createAnimationSet(anims, KNIGHT_ASSET_KEYS.KNIGHT, [
            {
                key: KNIGHT_ASSET_KEYS.KNIGHT_RUN_ANIM,
                start: 16,
                end: 31,
                frameRate: 10,
                repeat: -1
            },
            {
                key: KNIGHT_ASSET_KEYS.KNIGHT_IDLE_ANIM,
                start: 0,
                end: 3,
                frameRate: 4,
                repeat: -1
            },
            {
                key: KNIGHT_ASSET_KEYS.KNIGHT_JUMP_ANIM,
                start: 40,
                end: 48,
                frameRate: 15,
                repeat: 0
            }
        ]);
    }
}