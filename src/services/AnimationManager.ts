import Phaser from "phaser";

export class AnimationManager{
    static createPlayerAnims(anims: Phaser.Animations.AnimationManager){

             anims.create({
            key: 'idle_anim',
            frames: anims.generateFrameNumbers('player', { start: 0, end: 10 }),
            frameRate: 10,
            repeat: -1
        });

    }

    static createZombiAnims(anims: Phaser.Animations.AnimationManager){
                anims.create({
            key: 'run_anim',
            frames: anims.generateFrameNumbers('knight', { start: 16, end: 31 }),
            frameRate: 10,
            repeat: -1
        });

        anims.create({
            key: 'idle_anim',
            frames: anims.generateFrameNumbers('knight', { start: 0, end: 3 }),
            frameRate: 4,
            repeat: -1
        });

        anims.create({
            key: 'jump_anim',
            frames: anims.generateFrameNumbers('knight', { start: 40, end: 48 }),
            frameRate: 15,
        });
    }
}