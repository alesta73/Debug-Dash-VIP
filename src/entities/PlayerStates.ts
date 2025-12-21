// src/entities/PlayerStates.ts
import { StateMachine } from '../utils/StateMachine';
import type { IState } from '../utils/StateMachine'; // Adjust path as needed
import { Player } from './Player';
import { PLAYER_ASSET_KEYS } from '../assets/asset-keys';

// Base State to hold common references
class PlayerState {
  // 1. Declare properties explicitly (these are erased at runtime)
  protected player: Player;
  protected machine: StateMachine;

  // 2. Accept arguments as standard variables
  constructor(player: Player, machine: StateMachine) {
    // 3. Manually assign them
    this.player = player;
    this.machine = machine;
  }
}

export class IdleState extends PlayerState {
    enter() {
        this.player.sprite.anims.play(PLAYER_ASSET_KEYS.PLAYER_IDLE_ANIM, true);
    }
    update() {
        const body = this.player.body;
        if (this.player.movement.jumpsLeft < this.player.movement.config.maxJumps!) {
             // If we fell off a ledge
             this.machine.setState('fall');
        }
        else if (body && Math.abs(body.velocity.x) > 0) {
            this.machine.setState('run');
        }
    }
    exit() {}
}

export class RunState extends PlayerState {
    enter() {
        this.player.sprite.anims.play(PLAYER_ASSET_KEYS.PLAYER_RUN_ANIM, true);
    }
    update() {
        const body = this.player.body;
        if (body && Math.abs(body.velocity.x) === 0) {
            this.machine.setState('idle');
        }
        // Check fall logic here too
    }
    exit() {}
}

export class DashState extends PlayerState {
    enter() {
        // 1. Play Dash Animation (or single frame)
        // this.player.sprite.anims.play('player-dash'); 

        // 2. Optional: Procedural Stretch (Squash & Stretch)
        this.player.sprite.setScale(1.4, 0.6); 
    }

    update(time: number, delta: number) {
        // While dashing, we might want to rotate the sprite to face the dash direction
        // const vel = this.player.sprite.body!.velocity;
        // this.player.sprite.setRotation(Math.atan2(vel.y, vel.x));
    }

    exit() {
        // 3. Reset Scale
        this.player.sprite.setScale(1, 1);
        this.player.sprite.setRotation(0);

        // 4. CRITICAL: Decide where to go next based on Gravity/Environment
        const body = this.player.body;
        const onFloor = body ? body.onFloor() : false;
        
        if (onFloor) {
            // If we dashed along the ground or landed efficiently
            if (body && Math.abs(body.velocity.x) > 0) {
                this.machine.setState('run');
            } else {
                this.machine.setState('idle');
            }
        } else {
            // If we are still in the air, TRANSITION TO FALL immediately
            this.machine.setState('fall');
        }
    }
}

export class FallState extends PlayerState {
    enter() {
        // Play fall animation
        // this.player.sprite.anims.play('player-fall');
    }
    update() {
        const body = this.player.body;
        if (body && body.onFloor()) {
            this.machine.setState('idle'); // or 'land' state for impact frames
        }
    }
    exit() {}
}