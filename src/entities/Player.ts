import { StateMachine } from '../utils/StateMachine';
import { MovementComponent } from "../components/MovementComponent";
import { InputManager } from "../services/InputManager";
import type { IMovableBody, MovementIntent } from "../types";
import { DashComponent } from "../components/DashComponent";
import { ENTITY_STATE_ASSET_KEYS, PLAYER_ASSET_KEYS } from "../assets/asset-keys";

// --- State Classes ---

// Base State to hold common references
class PlayerState {
    // 1. Explicit property declarations for 'erasableSyntaxOnly' compatibility
    protected player: Player;
    protected machine: StateMachine;

    // 2. Standard constructor assignment
    constructor(player: Player, machine: StateMachine) {
        this.player = player;
        this.machine = machine;
    }
  
    enter() {}
    update(time: number, delta: number) {}
    exit() {}
}

class IdleState extends PlayerState {
    enter() {
        this.player.sprite.anims.play(PLAYER_ASSET_KEYS.PLAYER_IDLE_ANIM, true);
    }
    update() {
        const body = this.player.body;
        // Transition to Fall if moving down (gravity)
        if (body && !body.onFloor() && body.velocity.y > 0) {
             this.machine.setState('fall');
        }
        // Transition to Run if moving horizontally
        else if (body && Math.abs(body.velocity.x) > 0) {
            this.machine.setState('run');
        }
    }
}

class RunState extends PlayerState {
    enter() {
        this.player.sprite.anims.play(PLAYER_ASSET_KEYS.PLAYER_RUN_ANIM, true);
    }
    update() {
        const body = this.player.body;
        // Transition to Fall if moving down (gravity)
        if (body && !body.onFloor() && body.velocity.y > 0) {
            this.machine.setState('fall');
        } 
        // Transition to Idle if stopped
        else if (body && Math.abs(body.velocity.x) === 0) {
            this.machine.setState('idle');
        }
    }
}

class JumpState extends PlayerState {
    enter() {
        // Ensure PLAYER_JUMP_ANIM exists in your asset keys file
        this.player.sprite.anims.play(PLAYER_ASSET_KEYS.PLAYER_JUMP_ANIM, true);
    }
    update() {
        const body = this.player.body;
        
        // Transition to Fall once we start moving down (velocity Y > 0)
        if (body && body.velocity.y > 0) {
            this.machine.setState('fall');
        }
        // Safety check: if we hit a ceiling or ground instantly
        if (body && body.onFloor()) {
            this.machine.setState('idle');
        }
    }
}

class DashState extends PlayerState {
    enter() {
        this.player.sprite.setScale(1.4, 0.8); 
    }

    exit() {
        this.player.sprite.setScale(1, 1);
        this.player.sprite.setRotation(0);
    }
}

class FallState extends PlayerState {
    enter() {
        this.player.sprite.anims.play(PLAYER_ASSET_KEYS.PLAYER_FALL_ANIM, true);
    }
    update() {
        const body = this.player.body;
        if (body && body.onFloor()) {
            this.machine.setState('idle');
        }
    }
}


// --- Player Class ---

export class Player implements IMovableBody {
    public sprite: Phaser.Physics.Arcade.Sprite;
    public movement: MovementComponent;
    public dash: DashComponent;
    private inputManager: InputManager;
    private jumpBufferTimer: number = 0;
    private dashBufferTimer: number = 0;
    private readonly BUFFER_WINDOW: number = 83;
    private stateMachine: StateMachine;

    constructor(scene: Phaser.Scene, x: number, y: number, inputManager: InputManager) {
        this.sprite = scene.physics.add.sprite(x, y, PLAYER_ASSET_KEYS.PLAYER);
        this.sprite.setCollideWorldBounds(true);

        this.inputManager = inputManager;

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

        // 1. Setup State Machine
        this.stateMachine = new StateMachine();
        this.stateMachine.addState('idle', new IdleState(this, this.stateMachine));
        this.stateMachine.addState('run', new RunState(this, this.stateMachine));
        this.stateMachine.addState('dash', new DashState(this, this.stateMachine));
        this.stateMachine.addState('fall', new FallState(this, this.stateMachine));
        this.stateMachine.addState('jump', new JumpState(this, this.stateMachine)); // Added Jump

        this.stateMachine.setState('idle');

        // 2. Connect DashComponent Events
        this.dash.events.on('start', () => {
            this.stateMachine.setState('dash');
        });

        this.dash.events.on('end', () => {
            const onFloor = this.body?.onFloor();
            this.stateMachine.setState(onFloor ? 'idle' : 'fall');
        });

        // 3. Connect Movement Events
        this.movement.events.on(ENTITY_STATE_ASSET_KEYS.JUMP, () => {
            this.stateMachine.setState('jump');
        });
    }

    // =================================================================
    // IMovableBody Implementation
    // =================================================================

    get body(): Phaser.Physics.Arcade.Body | null {
        // Safe check for body type to fix "Property 'onFloor' does not exist on StaticBody"
        return this.sprite.body instanceof Phaser.Physics.Arcade.Body ? this.sprite.body : null;
    }

    get active(): boolean {
        return this.sprite.active;
    }

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

    update(time: number, delta: number) {
        // 1. Get Raw Input
        const jumpInput = this.inputManager.getJumpInput();
        const dashInput = this.inputManager.getDashInput();
        const moveInputHorizontal = this.inputManager.getHorizontalInput();
        const moveInputVertical = this.inputManager.getVerticalInput();

        // 2. Update Buffers
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

        // 3. Create Intent
        const intent: MovementIntent = {
            x: (moveInputHorizontal.right ? 1 : 0) - (moveInputHorizontal.left ? 1 : 0),
            y: (moveInputVertical.down ? 1 : 0) - (moveInputVertical.up ? 1 : 0),
            jump: jumpInput.isDown,
            jumpJustPressed: this.jumpBufferTimer > 0 && jumpInput.isDown,
            dash: dashInput.isDown,
            dashJustPressed: this.dashBufferTimer > 0 && dashInput.isDown,
        };

        // 4. Pass Intent to Systems that need it
        this.dash.update(delta, intent);
        this.movement.update(delta, intent);
        
        // 5. Update the State Machine
        this.stateMachine.update(time, delta);
    }
}