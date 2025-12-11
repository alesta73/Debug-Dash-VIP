import Phaser from "phaser";

import { MovementComponent } from "../components/MovementComponent";
import type { IMovableBody, MovementIntent } from "../types"; 
import { ENTITY_STATE_ASSET_KEYS, KNIGHT_ASSET_KEYS } from "../assets/asset-keys";

export class knight implements IMovableBody{
    public sprite: Phaser.Physics.Arcade.Sprite;
    public movement: MovementComponent;
    private moveTimer: number = 0;

    constructor(scene: Phaser.Scene, x: number, y: number){
        this.sprite = scene.physics.add.sprite(x, y, KNIGHT_ASSET_KEYS.KNIGHT);
        this.movement = new MovementComponent(scene, this, {
            speed: 50 ,
            jumpStrength: 300,
            jumpCutoff: 0.8
        });

          this.movement.events.on(ENTITY_STATE_ASSET_KEYS.JUMP, () => {
            this.sprite.anims.play(KNIGHT_ASSET_KEYS.KNIGHT_JUMP_ANIM, true);
        });

        this.movement.events.on(ENTITY_STATE_ASSET_KEYS.RUN, () => {
            this.sprite.anims.play(KNIGHT_ASSET_KEYS.KNIGHT_RUN_ANIM, true);
        });

        this.movement.events.on(ENTITY_STATE_ASSET_KEYS.IDLE, () => {
            this.sprite.anims.play(KNIGHT_ASSET_KEYS.KNIGHT_IDLE_ANIM, true);
        });
    }

    
    get body(): Phaser.Physics.Arcade.Body | null {
        return this.sprite.body instanceof Phaser.Physics.Arcade.Body ? this.sprite.body : null;
    }

    get active(): boolean {
        return this.sprite.active;
    }

    public setFlipX(value: boolean): this {
        this.sprite.setFlipX(value);
        return this;
    }
    public setDragX(value: number): this {
        this.sprite.setDragX(value);
        return this;
    }
    public setVelocityX(value: number): this{
        this.sprite.setVelocityX(value);
        return this;
    }
    public setVelocityY(value: number): this {
        this.sprite.setVelocityY(value);
        return this;
    }

    get flipX(): boolean {
        return this.sprite.flipX;
    }

    
    update( time: number, delta: number){
    

        let dirX = 0;
        this.moveTimer+= delta;
        if(this.moveTimer < 2000){
            dirX = -1;
        }else{
            dirX = 1;
        }
        if(this.moveTimer>3900){
            // console.log(this.moveTimer)
            this.moveTimer = 0;
        }
      const intent: MovementIntent = {
            x: dirX,
            y: 0,              // Added
            jump: false,
            jumpJustPressed: false,
            dash: false,       // Added
            dashJustPressed: false // Added
        }

        this.movement.update(delta, intent);
    
    }
}
