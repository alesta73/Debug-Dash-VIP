import Phaser from 'phaser';
import type { IMovableBody } from '../types';
import type { MovementIntent } from '../types/physics';

export interface MovementConfig {
    speed: number;
    jumpStrength: number;
    drag?: number;
    jumpCutoff?: number;
    maxJumps?: number;
    dashSpeed?: number;
    dashDuration?: number;
    maxDashes?: number;
    dashesAvailable?: number;
    dashRefillTime?: number;
}

export class MovementComponent {
    private scene: Phaser.Scene;
    public config: MovementConfig; // Made public for DashComponent access
    private gameObject: IMovableBody;

    // State
    private isGrounded: boolean = false;
    private wasGrounded: boolean = false;
    private coyoteTime: number = 100;
    private coyoteTimeCounter: number = 0;
    
    // Resources
    private jumpsAvailable: number = 0;
    private maxJumps: number;
    private dashesAvailable: number = 0;
    private maxDashes: number;
    private groundTimeCounter: number = 0;
    private dashRefillTime: number = 167; // 10 Frames

    private isLocked: boolean = false;
    public events: Phaser.Events.EventEmitter;

    constructor(scene: Phaser.Scene, gameObject: IMovableBody, config: MovementConfig) {
        this.scene = scene;
        this.gameObject = gameObject;
        this.config = config;
        this.events = new Phaser.Events.EventEmitter();

        this.maxJumps = config.maxJumps ?? 1;
        this.maxDashes = config.maxDashes ?? 1;
        
        this.gameObject.setDragX(config.drag ?? 0);

        this.dashRefillTime = config.dashRefillTime ?? 167;
    }

    // --- API FOR DASH COMPONENT ---
    public setLock(locked: boolean) {
        this.isLocked = locked;
        if (!locked) {
            this.gameObject.setDragX(this.config.drag ?? 0);
        }
    }

    public get jumpsLeft(): number { return this.jumpsAvailable; }
    public consumeJump() { this.jumpsAvailable--; }
    public resetCoyote() { this.coyoteTimeCounter = 0; }

    public get dashesLeft(): number { return this.dashesAvailable; }
    public consumeDash() { this.dashesAvailable--; }
    // ------------------------------

    public update(delta: number, intent: MovementIntent) {
        if (this.isLocked) return; 

        this.updateGroundState(delta);
        this.handleHorizontalMovement(intent);
        this.handleJump(intent);
    }

    private updateGroundState(delta: number) {
        if (!this.gameObject.body) return;

        const onFloor = (this.gameObject.body as Phaser.Physics.Arcade.Body).onFloor();

        if (onFloor) {
            this.isGrounded = true;
            this.coyoteTimeCounter = this.coyoteTime;
            this.jumpsAvailable = this.maxJumps;

            // Refill Logic
            if (!this.wasGrounded) {
                this.dashesAvailable = this.maxDashes; // Instant refill on land
                this.groundTimeCounter = 0;
            } else {
                if (this.dashesAvailable < this.maxDashes) {
                    this.groundTimeCounter += delta;
                    if (this.groundTimeCounter >= this.dashRefillTime) {
                        this.dashesAvailable = this.maxDashes;
                    }
                }
            }
        } else {
            this.isGrounded = false;
            this.groundTimeCounter = 0;
            this.coyoteTimeCounter -= delta;

            if (this.coyoteTimeCounter <= 0 && this.jumpsAvailable === this.maxJumps) {
                this.jumpsAvailable = this.maxJumps - 1;
            }
        }

        if (!this.isGrounded && this.wasGrounded) {
            this.events.emit('fall');
        }
        this.wasGrounded = this.isGrounded;
    }

    private handleHorizontalMovement(intent: MovementIntent) {
        if (!this.gameObject.body) return;
        const body = this.gameObject.body as Phaser.Physics.Arcade.Body;

        if (this.isGrounded) {
            if (intent.x !== 0 && Math.abs(body.velocity.x) <= this.config.speed) { 
                this.gameObject.setDragX(0); 
            } else { 
                this.gameObject.setDragX(4000); 
            }
        } else {
            this.gameObject.setDragX(0);
        }

        // Speed Police: Only restrict if within speed limit. 
        // This allows Super Dash velocity (260+) to slide freely.
        if (Math.abs(body.velocity.x) <= this.config.speed) {
            this.gameObject.setVelocityX(intent.x * this.config.speed);
        }

        if (intent.x < 0) {
            this.gameObject.setFlipX(true);
            if (this.isGrounded) this.events.emit('move', 'left');
        } else if (intent.x > 0) {
            this.gameObject.setFlipX(false);
            if (this.isGrounded) this.events.emit('move', 'right');
        } else {
            if (this.isGrounded) this.events.emit('idle');
        }
    }

    private handleJump(intent: MovementIntent) {
        if (intent.jumpJustPressed && this.jumpsAvailable > 0) {
            this.gameObject.setVelocityY(-this.config.jumpStrength);
            this.events.emit('jump');
            this.jumpsAvailable--;
            this.coyoteTimeCounter = 0;
        }

        if (!intent.jump && this.gameObject.body && this.gameObject.body.velocity.y < 0) {
            this.gameObject.setVelocityY(this.gameObject.body.velocity.y * (this.config.jumpCutoff ?? 0.9));
        }
    }
}