import Phaser from 'phaser';
import type { IMovableBody } from '../types';
import type { MovementIntent } from '../types/physics';

// Configuration for movement properties
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
}

// A reusable component for character movement physics
export class MovementComponent {
    private scene: Phaser.Scene;
    private config: MovementConfig;
    private gameObject: IMovableBody;     // Decoupled: Uses interface instead of concrete Sprite class

    // State
    private isGrounded: boolean = false;
    private wasGrounded: boolean = false;
    private coyoteTime: number = 100;
    private coyoteTimeCounter: number = 0;
    private jumpsAvailable: number = 0;
    private maxJumps: number;

    // Dash Config(från frames til ms)
    private dashSpeed: number;
    private dashFreezeTime: number = 67;
    private dashActiveTime: number = 167;
    private dashRefillTime: number = 167;

    // New state for braking
    private isDashStopping: boolean = false;
    private stoppingTween: Phaser.Tweens.Tween | null = null;

    // Dash State
    private dashFreezeCounter: number = 0;
    private dashActiveCounter: number = 0;
    private dashDirection: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
    // private dashDuration: number;
    // private dashTimeCounter: number = 0;
    private dashesAvailable: number = 0;
    private maxDashes: number;
    private groundTimeCounter: number = 0;

    private facingDir: number = 1; // 1 = Right, -1 = Left

    public events: Phaser.Events.EventEmitter;

    constructor(
        scene: Phaser.Scene,
        gameObject: IMovableBody,
        config: MovementConfig
    ) {
        this.scene = scene;
        this.gameObject = gameObject;
        this.config = config;
        this.events = new Phaser.Events.EventEmitter();

        this.dashSpeed = config.dashSpeed ?? 350;
        this.maxJumps = config.maxJumps ?? 1;
        this.maxDashes = config.maxDashes ?? 1;

        this.gameObject.setDragX(config.drag ?? 0);

        // const dragValue = config.drag ?? 0;
        // const jumpCutoff = config.jumpCutoff ?? 0.5;
        // const dashSpeed = config.dashSpeed ?? 350;
        // const dashDuration = config.dashDuration ?? 200;
        // this.maxDashes = config.maxDashes ?? 1;

        // this.dashSpeed = dashSpeed;
        // this.dashDuration = dashDuration;
        // this.config = { ...config, drag: dragValue, jumpCutoff: jumpCutoff };

        // this.events = new Phaser.Events.EventEmitter();

        // this.gameObject.setDragX(dragValue);
        // this.maxJumps = config.maxJumps ?? 1;
    }

    public update(delta: number, intent: MovementIntent) {

        if (this.handleDash(delta, intent)) return;

        this.updateGroundState(delta);

        this.handleHorizontalMovement(intent);

        this.handleJump( intent);
    }
private updateGroundState(delta: number) {
        if (!this.gameObject.body) return;

        const onFloor = (this.gameObject.body as Phaser.Physics.Arcade.Body).onFloor();

        if (onFloor) {
            this.isGrounded = true;
            this.coyoteTimeCounter = this.coyoteTime;
            this.jumpsAvailable = this.maxJumps;

            // --- REFILL LOGIC ---
            
            // 1. INSTANT REFILL: If we just landed this frame
            if (!this.wasGrounded) {
                this.dashesAvailable = this.maxDashes;
                this.groundTimeCounter = 0; // Reset timer
            } 
            // 2. TIMED REFILL: If we are staying on the ground (Ground Dash cooldown)
            else {
                if (this.dashesAvailable < this.maxDashes) {
                    this.groundTimeCounter += delta;
                    if (this.groundTimeCounter >= this.dashRefillTime) {
                        this.dashesAvailable = this.maxDashes;
                    }
                }
            }

        } else {
            this.isGrounded = false;
            this.groundTimeCounter = 0; // Reset timer if we leave ground
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

   public handleDash(delta: number, intent: MovementIntent): boolean {

        // --- 1. START DASH ---
        // Trigger if button pressed, dashes available, and we aren't already dashing
        if (intent.dashJustPressed && this.dashesAvailable > 0 && this.dashActiveCounter <= 0 && this.dashFreezeCounter <= 0) {
            this.dashesAvailable--;
            
            // Start the Freeze Timer (4 Frames / ~67ms)
            this.dashFreezeCounter = this.dashFreezeTime;
            
            // Calculate direction immediately
            if (intent.x !== 0 || intent.y !== 0) {
                this.dashDirection.set(intent.x, intent.y).normalize();
            } else {
                this.dashDirection.set(this.facingDir, 0).normalize();
            }

            // Setup Physics for the Dash (Run ONCE)
            if (this.gameObject.body instanceof Phaser.Physics.Arcade.Body) {
                this.gameObject.body.allowGravity = false;
                this.gameObject.setDragX(0); // Remove drag so we don't fight physics
            }

            // Emit Event (Run ONCE) - Clears the Dash Buffer in Player.ts
            this.events.emit('dash'); 
            
            return true; // Stop the main update loop
        }

        // --- 2. HANDLE FREEZE PHASE (4 Frames / ~67ms) ---
        if (this.dashFreezeCounter > 0) {
            this.dashFreezeCounter -= delta;

            // Lock player in place
            this.gameObject.setVelocityX(0);
            this.gameObject.setVelocityY(0);
            
            // Ensure gravity/drag stay off (safety check)
            if (this.gameObject.body instanceof Phaser.Physics.Arcade.Body) {
                this.gameObject.body.allowGravity = false;
                this.gameObject.setDragX(0);
            }

            // Transition: Freeze ended? Start moving!
            if (this.dashFreezeCounter <= 0) {
                this.dashActiveCounter = this.dashActiveTime; // Start movement timer (10 Frames)
                
                // Apply the velocity NOW
                this.gameObject.setVelocityX(this.dashDirection.x * this.dashSpeed);
                this.gameObject.setVelocityY(this.dashDirection.y * this.dashSpeed);
            }
            
            return true; // Stop the main update loop
        }

        // --- 3. HANDLE ACTIVE PHASE (10 Frames / ~167ms) ---
        if (this.dashActiveCounter > 0) {
            this.dashActiveCounter -= delta;

            // A. SUPER DASH / HYPERDASH (Jump Interrupt)
            // If jump is buffered (intent.jumpJustPressed) and we have jumps left...
            if (intent.jumpJustPressed && this.jumpsAvailable > 0) {
                this.endDash(); // Helper to reset state/gravity

                // Apply Super Boost (Momentum)
                if (this.facingDir === 1) {
                    this.gameObject.setVelocityX(260); // Adjust this value for "Super" feel
                } else {
                    this.gameObject.setVelocityX(-260);
                }

                // Apply Jump Force
                this.gameObject.setVelocityY(-this.config.jumpStrength);
                
                // Update State
                this.events.emit('jump'); // Emits jump event (clears jump buffer)
                this.jumpsAvailable--;
                this.coyoteTimeCounter = 0;
                
                return true; // Stop loop (we are now jumping, not dashing)
            }

            // B. DASH COMPLETED?
            if (this.dashActiveCounter <= 0) {
                this.endDash(); // Reset gravity, etc.
                // We return 'false' here so the main update loop continues 
                // and immediately applies normal ground/air physics this same frame.
                return false; 
            } 
            
            // C. STEERING (Late Dash Control)
            // Allow slight influence on trajectory at the end of the dash
            const steeringWindow = this.dashActiveTime * 0.3;
            if (this.dashActiveCounter < steeringWindow) {
                const steerFactor = 0.15;
                const body = this.gameObject.body as Phaser.Physics.Arcade.Body;

                if (body) {
                    if (intent.x !== 0) {
                        const targetX = intent.x * this.dashSpeed;
                        body.velocity.x = Phaser.Math.Linear(body.velocity.x, targetX, steerFactor);
                    }
                    if (intent.y !== 0) {
                        const targetY = intent.y * this.dashSpeed;
                        body.velocity.y = Phaser.Math.Linear(body.velocity.y, targetY, steerFactor);
                    }
                }
            }

            return true; // Still dashing, stop main update loop
        }

        return false; // Not dashing at all
    }

    // Helper method to keep things clean
    private endDash() {
        this.dashFreezeCounter = 0;
        this.dashActiveCounter = 0;
        if (this.gameObject.body instanceof Phaser.Physics.Arcade.Body) {
            this.gameObject.body.allowGravity = true;
        }
    }

    // Updates movement based on Intent, called every frame
    public handleHorizontalMovement(intent: MovementIntent) {

        if (!this.gameObject.body) return;
        const body = this.gameObject.body as Phaser.Physics.Arcade.Body;

        if (this.isGrounded) {
            //kolla speed: 
            if (intent.x !== 0 && Math.abs(body.velocity.x) <= this.config.speed) { this.gameObject.setDragX(0); }
            else { this.gameObject.setDragX(4000); }
        } else {
            this.gameObject.setDragX(0);
        }

        if (Math.abs(body.velocity.x) <= this.config.speed) {
            this.gameObject.setVelocityX(intent.x * this.config.speed);
        }

        //Flip logic
        if (intent.x < 0) {
            this.gameObject.setFlipX(true);
            this.facingDir = -1;
            if (this.isGrounded) this.events.emit('move', 'left');
        } else if (intent.x > 0) {
            this.gameObject.setFlipX(false);
            this.facingDir = 1;
            if (this.isGrounded) this.events.emit('move', 'right');
        } else {
            if (this.isGrounded) this.events.emit('idle');
        }
    }
    public handleJump(intent: MovementIntent) {
        if (intent.jumpJustPressed && this.jumpsAvailable > 0) {
            this.gameObject.setVelocityY(-this.config.jumpStrength);
            this.events.emit('jump');
            this.jumpsAvailable--;
            this.coyoteTimeCounter = 0;
        
        }
        if(!intent.jump && this.gameObject.body && this.gameObject.body.velocity.y < 0){
            this.gameObject.setVelocityY(this.gameObject.body.velocity.y * (this.config.jumpCutoff ?? 0.9));
        }
    }
}