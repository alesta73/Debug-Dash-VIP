import Phaser from "phaser";
import { MovementComponent } from "../components/MovementComponent";
import { InputManager } from "../services/InputManager";
import type { IMovableBody, MovementIntent } from "../types";
import { DashComponent } from "../components/DashComponent";

// Represents the player character in the game
// Acts as an Adapter: Implements IMovableBody to bridge Phaser Sprite <-> MovementComponent
export class Player implements IMovableBody {
    public sprite: Phaser.Physics.Arcade.Sprite;
    public movement: MovementComponent;
    public dash: DashComponent;
    private inputManager: InputManager;
    private jumpBufferTimer: number = 0;
    private dashBufferTimer: number = 0;
    private readonly BUFFER_WINDOW: number = 83;

    constructor(scene: Phaser.Scene, x: number, y: number, inputManager: InputManager) {
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
            maxDashes: 1,
            dashRefillTime: 32
        });

        this.dash = new DashComponent(scene, this, this.movement, {
            speed: 240,
            duration: 150,
        });


        this.movement.events.on('jump', () => {
            this.sprite.anims.play('jump_anim', true);
            this.jumpBufferTimer = 0; // <--- CONSUME BUFFER
        });

        this.movement.events.on('dash', () => {
            this.dashBufferTimer = 0; // <--- CONSUME BUFFER
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

    get flipX(): boolean {
        return this.sprite.flipX;
    }

    // =================================================================
    // Game Loop
    // =================================================================

    // Updates the player's state each frame
    update(time: number, delta: number) {
        // ... inside update(time, delta) ...

        // 1. Get Raw Input
        const jumpInput = this.inputManager.getJumpInput();
        const dashInput = this.inputManager.getDashInput();
        const moveInputHorizontal = this.inputManager.getHorizontalInput();
        const moveInputVertical = this.inputManager.getVerticalInput();

        // 2. Update Buffers
        // If pressed this frame, set timer to full window. Otherwise count down.
        if (jumpInput.justDown) {
            this.jumpBufferTimer = this.BUFFER_WINDOW;
        } else {
            this.jumpBufferTimer -= delta;
        }

        if (dashInput.justDown) {
            this.dashBufferTimer = this.BUFFER_WINDOW;
        } else {
            this.dashBufferTimer -= delta;
        }

        // 3. Create Intent using Buffer
        // Intent is valid if: Buffer is active (> 0) AND button is still held
        const intent: MovementIntent = {
            x: (moveInputHorizontal.right ? 1 : 0) - (moveInputHorizontal.left ? 1 : 0),
            y: (moveInputVertical.down ? 1 : 0) - (moveInputVertical.up ? 1 : 0),
            jump: jumpInput.isDown,
            // BUFFERED CHECK:
            jumpJustPressed: this.jumpBufferTimer > 0 && jumpInput.isDown,
            dash: dashInput.isDown,
            // BUFFERED CHECK:
            dashJustPressed: this.dashBufferTimer > 0 && dashInput.isDown,
        };

        // 4. Pass Intent to the System
        this.dash.update(delta, intent);
        this.movement.update(delta, intent);
    }
}
