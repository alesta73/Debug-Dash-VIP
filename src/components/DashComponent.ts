import Phaser from 'phaser';
import type { IMovableBody, MovementIntent } from '../types';
import { MovementComponent } from './MovementComponent';

interface DashConfig {
    speed: number;
    duration?: number; 
    ghostInterval?: number; 
}

export class DashComponent {
    private scene: Phaser.Scene;
    private gameObject: IMovableBody;
    private movement: MovementComponent;
    private config: DashConfig;

    // Celeste Config (MS)
    private dashFreezeTime: number = 33;
    private dashActiveTime: number = 167;

    // State Machine
    private dashFreezeCounter: number = 0;
    private dashActiveCounter: number = 0;
    private dashDirection: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
    
    // Visuals: Sandevistan Effect
    private ghostTimer: number = 0;
    private readonly DEFAULT_GHOST_INTERVAL: number = 32; 
    // NEW: Track if we are currently in a Super Dash flight
    private isSuperDashing: boolean = false; 

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
        if (intent.dashJustPressed && this.movement.dashesLeft > 0 && this.dashActiveCounter <= 0 && this.dashFreezeCounter <= 0) {
            this.startDash(intent);
        }

        // 2. CHECK LANDING (Reset Super Dash)
        if (this.isSuperDashing) {
            const body = this.gameObject.body;
            // If we touch the ground, the super dash flight is over
            if (body instanceof Phaser.Physics.Arcade.Body && body.onFloor()) {
                this.isSuperDashing = false;
            }
        }

        // 3. VISUALS: SANDEVISTAN TRAIL
        // Apply effect if Dashing OR Super Dashing (but not during freeze frames)
        if ((this.dashActiveCounter > 0 || this.isSuperDashing) && this.dashFreezeCounter <= 0) {
            this.handleGhostTrail(delta);
        }

        // 4. STATE MACHINE

        // A. FREEZE PHASE
        if (this.dashFreezeCounter > 0) {
            this.dashFreezeCounter -= delta;
            
            this.gameObject.setVelocityX(0);
            this.gameObject.setVelocityY(0);
            if (this.gameObject.body instanceof Phaser.Physics.Arcade.Body) {
                this.gameObject.body.allowGravity = false;
            }

            if (this.dashFreezeCounter <= 0) {
                this.dashActiveCounter = this.dashActiveTime;
                this.gameObject.setVelocityX(this.dashDirection.x * this.config.speed);
                this.gameObject.setVelocityY(this.dashDirection.y * this.config.speed);
                this.ghostTimer = 0; 
            }
            return;
        }

        // B. ACTIVE PHASE
        if (this.dashActiveCounter > 0) {
            this.dashActiveCounter -= delta;

            // --- SUPER DASH LOGIC ---
            if (intent.jumpJustPressed && this.movement.jumpsLeft > 0) {
                this.performSuperDash(intent);
                return;
            }

            // End of Dash?
            if (this.dashActiveCounter <= 0) {
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
            if (intent.x !== 0 || intent.y !== 0 || intent.jumpJustPressed || intent.dashJustPressed) {
                this.endDash();
            }
        }
    }

    private startDash(intent: MovementIntent) {
        this.isSuperDashing = false; // Reset super dash state on new dash
        this.movement.consumeDash();
        this.movement.setLock(true);
        this.dashFreezeCounter = this.dashFreezeTime;

        if (intent.x !== 0 || intent.y !== 0) {
            this.dashDirection.set(intent.x, intent.y).normalize();
        } else {
            const facing = this.gameObject.flipX ? -1 : 1; 
            this.dashDirection.set(facing, 0);
        }

        if (this.gameObject.body instanceof Phaser.Physics.Arcade.Body) {
            this.gameObject.body.allowGravity = false;
            this.gameObject.setDragX(0);
        }

        this.events.emit('start');
    }

    private performSuperDash(intent: MovementIntent) {
        this.endDash(); // Clears normal dash state/locks

        this.isSuperDashing = true; // Enable trail persistence

        this.movement.consumeJump();
        this.movement.resetCoyote();

        const facing = this.dashDirection.x > 0 ? 1 : -1;
        this.gameObject.setVelocityX(facing * 260);
        this.gameObject.setVelocityY(-this.movement.config.jumpStrength);

        intent.jumpJustPressed = false; 
        this.movement.events.emit('jump');
    }

    private handleGhostTrail(delta: number) {
        this.ghostTimer -= delta;
        if (this.ghostTimer <= 0) {
            this.createAfterImage();
            this.ghostTimer = this.config.ghostInterval ?? this.DEFAULT_GHOST_INTERVAL;
        }
    }

    private createAfterImage() {
        const parent = this.gameObject as any;
        const parentSprite = parent.sprite as Phaser.Physics.Arcade.Sprite;

        if (!parentSprite || !parentSprite.texture) return;

        const ghost = this.scene.add.image(
            parentSprite.x, 
            parentSprite.y, 
            parentSprite.texture.key, 
            parentSprite.frame.name
        );
        
        ghost.setFlipX(parentSprite.flipX);
        ghost.setScale(parentSprite.scaleX, parentSprite.scaleY);
        ghost.setRotation(parentSprite.rotation);
        ghost.setTint(0x00FFD0); // Cyberpunk Cyan
      //  ghost.setTint(0xFF0000); // Red (Sandevistan)
        ghost.setAlpha(0.4);
        ghost.setDepth(parentSprite.depth); 

        this.scene.tweens.add({
            targets: ghost,
            alpha: 0,
            duration: 600,
            ease: 'Power2',
            onComplete: () => {
                ghost.destroy();
            }
        });
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
        // Do NOT reset isSuperDashing here, as endDash is called 
        // immediately when performSuperDash starts.
        
        this.movement.setLock(false);
        
        if (this.gameObject.body instanceof Phaser.Physics.Arcade.Body) {
            this.gameObject.body.allowGravity = true;
        }
        
        this.events.emit('end');
    }
}