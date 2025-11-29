import Phaser from "phaser";

import { MovementComponent } from "../components/MovementComponent";
import type { IMovableBody, MovementIntent } from "../types"; 

export class Zombie implements IMovableBody{
    public sprite: Phaser.Physics.Arcade.Sprite;
    public movement: MovementComponent;
    private moveTimer: number = 0;

    constructor(scene: Phaser.Scene, x: number, y: number){
        this.sprite = scene.physics.add.sprite(x, y, 'knight');
        this.movement = new MovementComponent(scene, this, {
            speed: 100,
            jumpStrength: 300,
            jumpCutoff: 0.8
        });

          this.movement.events.on('jump', () => {
            this.sprite.anims.play('jump_anim', true);
        });

        this.movement.events.on('move', () => {
            this.sprite.anims.play('run_anim', true);
        });

        this.movement.events.on('idle', () => {
            this.sprite.anims.play('idle_anim', true);
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
