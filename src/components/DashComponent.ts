import Phaser from 'phaser';
import type { IMovableBody, MovementIntent } from '../types';
import { MovementComponent } from './MovementComponent';

interface DashConfig {
    speed: number;
    duration?: number; // Not strictly used if we use Celeste frames, but good for config
}

export class DashComponent {
    private scene: Phaser.Scene;
    private gameObject: IMovableBody;
    private movement: MovementComponent;
    private config: DashConfig;

    // Celeste Config (MS)
    private dashFreezeTime: number = 33;  // 67 = 4 Frames, 33-34 = 2 frames at 60fps
    private dashActiveTime: number = 167; // 10 Frames

    // State Machine
    private dashFreezeCounter: number = 0;
    private dashActiveCounter: number = 0;
    private dashDirection: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
    
    // Braking Logic
    private isDashStopping: boolean = false;
    private stoppingTween: Phaser.Tweens.Tween | null = null;

    public events: Phaser.Events.EventEmitter;

    constructor(scene: Phaser.Scene, gameObject: IMovableBody, movement: MovementComponent, config: DashConfig) {
        this.scene = scene;
        this.gameObject = gameObject;
        this.movement = movement;
        this.config = config;
        this.events = new Phaser.Events.EventEmitter();
    }

    public update(delta: number, intent: MovementIntent) {
        
        // 1. START DASH
        // We use movement.dashesLeft to check resources
        if (intent.dashJustPressed && this.movement.dashesLeft > 0 && this.dashActiveCounter <= 0 && this.dashFreezeCounter <= 0) {
            this.startDash(intent);
        }

        // 2. STATE MACHINE

        // A. FREEZE PHASE (4 Frames)
        if (this.dashFreezeCounter > 0) {
            this.dashFreezeCounter -= delta;
            
            // Freeze positions
            this.gameObject.setVelocityX(0);
            this.gameObject.setVelocityY(0);
            if (this.gameObject.body instanceof Phaser.Physics.Arcade.Body) {
                this.gameObject.body.allowGravity = false;
            }

            // Transition -> Active
            if (this.dashFreezeCounter <= 0) {
                this.dashActiveCounter = this.dashActiveTime;
                this.gameObject.setVelocityX(this.dashDirection.x * this.config.speed);
                this.gameObject.setVelocityY(this.dashDirection.y * this.config.speed);
            }
            return;
        }

        // B. ACTIVE PHASE (10 Frames)
        if (this.dashActiveCounter > 0) {
            this.dashActiveCounter -= delta;

            // --- SUPER DASH LOGIC ---
            // If jump is pressed during dash, CANCEL dash and apply Boost
            if (intent.jumpJustPressed && this.movement.jumpsLeft > 0) {
                this.performSuperDash(intent);
                return;
            }

            // End of Dash?
            if (this.dashActiveCounter <= 0) {
                // If no input, brake. Else, carry momentum.
                if (intent.x === 0 && intent.y === 0) {
                    this.startDashStop();
                } else {
                    this.endDash();
                }
            }
            return;
        }

        // C. BRAKING PHASE
        if (this.isDashStopping) {
            // Cancel brake if any input
            if (intent.x !== 0 || intent.y !== 0 || intent.jumpJustPressed || intent.dashJustPressed) {
                this.endDash();
            }
        }
    }

    private startDash(intent: MovementIntent) {
        this.movement.consumeDash(); // Use resource
        this.movement.setLock(true); // Disable MovementComponent

        this.dashFreezeCounter = this.dashFreezeTime;

        // Determine Direction
        if (intent.x !== 0 || intent.y !== 0) {
            this.dashDirection.set(intent.x, intent.y).normalize();
        } else {
            // Use flipX to guess direction if neutral
            const facing = this.gameObject.flipX ? -1 : 1; 
            this.dashDirection.set(facing, 0);
        }

        // Setup Physics
        if (this.gameObject.body instanceof Phaser.Physics.Arcade.Body) {
            this.gameObject.body.allowGravity = false;
            this.gameObject.setDragX(0);
        }

        this.events.emit('start'); // Emits 'dash' effectively
    }

    private performSuperDash(intent: MovementIntent) {
        this.endDash(); // Unlock movement immediately

        // 1. Consume Jump Resource
        this.movement.consumeJump();
        this.movement.resetCoyote();

        // 2. Apply Super Velocity
        const facing = this.dashDirection.x > 0 ? 1 : -1;
        
        // Boost X (260 is the magic number)
        this.gameObject.setVelocityX(facing * 260);
        // Boost Y (Use normal jump strength)
        this.gameObject.setVelocityY(-this.movement.config.jumpStrength);

        // 3. Prevent double-jump in MovementComponent
        // We consumed the input here, so we don't want MovementComponent to see it this frame
        intent.jumpJustPressed = false; 

        this.movement.events.emit('jump');
    }

    private startDashStop() {
        this.isDashStopping = true;
        
        if (this.gameObject.body instanceof Phaser.Physics.Arcade.Body) {
             this.gameObject.body.allowGravity = false;
        }

        this.stoppingTween = this.scene.tweens.add({
            targets: this.gameObject.body!.velocity,
            x: 0,
            y: 0,
            duration: 50, 
            ease: 'Quint.easeOut',
            onComplete: () => {
                this.endDash();
            }
        });
    }

    private endDash() {
        this.isDashStopping = false;
        if (this.stoppingTween) {
            this.stoppingTween.stop();
            this.stoppingTween = null;
        }

        this.dashFreezeCounter = 0;
        this.dashActiveCounter = 0;
        
        // Unlock movement and reset gravity
        this.movement.setLock(false);
        
        if (this.gameObject.body instanceof Phaser.Physics.Arcade.Body) {
            this.gameObject.body.allowGravity = true;
        }
        
        this.events.emit('end');
    }
}