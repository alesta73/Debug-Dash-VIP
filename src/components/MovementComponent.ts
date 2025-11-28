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

    public handleDash(delta: number, intent: MovementIntent) {
        // Start Dash: 
        if (intent.dashJustPressed && this.dashesAvailable > 0 && this.dashActiveCounter <= 0 && this.dashFreezeCounter <= 0) {
            this.dashesAvailable--;

            //Freeze
            this.dashFreezeCounter = this.dashFreezeTime;

            if (intent.x !== 0 || intent.y !== 0) { //om intent visar vänster, höger, upp eller ner
                this.dashDirection.set(intent.x, intent.y).normalize(); //sätter dashDirection åt det håll intent säger, normalize tar bort 41% movementspeed bugg. 
            } else {
                this.dashDirection.set(this.facingDir, 0).normalize();
            }
            return true;
        }

        //Handle freeze phase (4 frames)
        if (this.dashFreezeCounter > 0) {
            this.dashFreezeCounter -= delta;

            //frys player i 4 frames
            this.gameObject.setVelocityX(0);
            this.gameObject.setVelocityY(0);
            if (this.gameObject.body instanceof Phaser.Physics.Arcade.Body) {
                this.gameObject.setDragX(0);
                this.gameObject.body.allowGravity = false;
            }

            //om freeze tagit slut, starta dash
            if (this.dashFreezeCounter <= 0) {
                this.dashActiveCounter = this.dashActiveTime; //starta movement timer

                this.gameObject.setVelocityX(this.dashDirection.x * this.dashSpeed);
                this.gameObject.setVelocityY(this.dashDirection.y * this.dashSpeed);
            }
            return true;
        }


        //handle movement phase: 11 frames
        if (this.dashActiveCounter > 0) {
            this.dashActiveCounter -= delta;

            //super/hyperdash logik
            if (intent.jumpJustPressed && this.jumpsAvailable > 0) {
                this.endDash();
                //applicera speed buff
                if (this.facingDir === 1) this.gameObject.setVelocityX(260);
                else this.gameObject.setVelocityX(-260);
                this.gameObject.setVelocityY(-this.config.jumpStrength);
                this.events.emit('jump');

                this.jumpsAvailable--;
                this.coyoteTimeCounter = 0;
                return true;
            }

            //End of dash
            if (this.dashActiveCounter <= 0) {
                this.endDash();
            } else {
                const steeringWindow = this.dashActiveTime * 0.3;
                if (this.dashActiveCounter < steeringWindow) {
                    const steerFactor = 0.15; // How strong the steering is (0.0 to 1.0)
                    const body = this.gameObject.body as Phaser.Physics.Arcade.Body;

                    if (body) {
                        // Blend current velocity towards intent
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
                return true;
            }
        }
        return false;
    }

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