import Phaser from "phaser";
import { MovementComponent } from "../components/MovementComponent";
import { InputManager } from "../services/InputManager";
import type { IMovableBody, MovementIntent } from "../types";

// Represents the player character in the game
// Acts as an Adapter: Implements IMovableBody to bridge Phaser Sprite <-> MovementComponent
export class Player implements IMovableBody {
    public sprite: Phaser.Physics.Arcade.Sprite;
    public movement: MovementComponent;
    private inputManager: InputManager;

    constructor(scene: Phaser.Scene, x: number, y: number, inputManager: InputManager){
        // this.sprite = scene.physics.add.sprite(x, y, 'knight');
        this.sprite = scene.physics.add.sprite(x, y, 'player');
        this.sprite.setCollideWorldBounds(true);

        this.inputManager = inputManager;
        
        // Initialize the movement component
        // We pass 'this' because Player now satisfies the IMovableBody interface
        this.movement = new MovementComponent(scene, this, {
            speed: 90, 
            jumpStrength: 275,
            jumpCutoff: 0.8,
            dashSpeed: 240,
            dashDuration: 150
        });

     // ... inside Player constructor ...

        this.movement.events.on('jump', () => {
            this.sprite.anims.play('jump_anim', true);
        });

        this.movement.events.on('move', () => {
            // FIX: Only switch to run if we are actually on the ground
            if (this.body?.onFloor() && this.body.velocity.y >= 0) {
                this.sprite.anims.play('run_anim', true);
            }
        });

        this.movement.events.on('idle', () => {
            // FIX: Only switch to idle if we are actually on the ground
          if (this.body?.onFloor() && this.body.velocity.y >= 0) {
                this.sprite.anims.play('idle_anim', true);
            }
        });
        
        // Optional: Handle the new fall event if you want a fall animation
        // this.movement.events.on('fall', () => { ... });
    }

    // =================================================================
    // IMovableBody Implementation (The Adapter Methods)
    // =================================================================
    
    // Expose the underlying physics body to the component safely
    get body(): Phaser.Physics.Arcade.Body | null {
        return this.sprite.body instanceof Phaser.Physics.Arcade.Body ? this.sprite.body : null;
    }

    // Expose active state
    get active(): boolean {
        return this.sprite.active;
    }

    // Proxy methods to the internal sprite, returning 'this' for chaining if needed
    public setVelocityX(value: number): this {
        this.sprite.setVelocityX(value);
        return this;
    }

    public setVelocityY(value: number): this {
        this.sprite.setVelocityY(value);
        return this;
    }

    public setDragX(value: number): this {
        this.sprite.setDragX(value);
        return this;
    }

    public setFlipX(value: boolean): this {
        this.sprite.setFlipX(value);
        return this;
    }

    // =================================================================
    // Game Loop
    // =================================================================

    // Updates the player's state each frame
    update(time: number, delta: number){

        // console.log(delta)
        // 1. Get Raw Input (Specific to Keyboard/InputManager)
        const moveInputHorizontal = this.inputManager.getHorizontalInput(); // { left, right }
        const moveInputVertical = this.inputManager.getVerticalInput(); // { up, down }

        const jumpInput = this.inputManager.getJumpInput();  
        const dashInput = this.inputManager.getDashInput();
       // { justDown, isDown, justUp }

        // 2. Convert to Neutral "Intent" (The Translator Step)
        let dirX = 0;
        if (moveInputHorizontal.left) dirX = -1;
        if (moveInputHorizontal.right) dirX = 1;

        let dirY = 0;
        if (moveInputVertical.up) dirY = -1;
        if (moveInputVertical.down) dirY = 1;


        const intent: MovementIntent = {
            x: dirX,
            y: dirY,
            jump: jumpInput.isDown,
            jumpJustPressed: jumpInput.justDown,
            dash: dashInput.isDown,
            dashJustPressed: dashInput.justDown,
        };

        // 3. Pass Intent to the System
        this.movement.update(delta, intent);
    }
}