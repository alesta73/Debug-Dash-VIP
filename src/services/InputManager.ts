import Phaser from 'phaser';

// Manages all keyboard input for the game
export class InputManager {
    private scene: Phaser.Scene;
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        // Initialize cursor keys for input
        if(this.scene.input.keyboard){
            this.cursors = this.scene.input.keyboard.createCursorKeys();
        }
    }

    // Returns the state of horizontal movement keys
    public getHorizontalInput() {
        return {
            left: this.cursors.left.isDown,
            right: this.cursors.right.isDown,
        };
    }

    public getVerticalInput() {
        return {
            up: this.cursors.up.isDown,
            down: this.cursors.down.isDown,
        };
    }


    // Returns the state of the jump key
    public getJumpInput() {
        return {
            justDown: Phaser.Input.Keyboard.JustDown(this.cursors.space),
            isDown: this.cursors.space.isDown,
            justUp: Phaser.Input.Keyboard.JustUp(this.cursors.space),
        };
    }


    // Returns the state of the dash key
    public getDashInput() {
        return {
            justDown: Phaser.Input.Keyboard.JustDown(this.cursors.shift),
            isDown: this.cursors.shift.isDown,
            justUp: Phaser.Input.Keyboard.JustUp(this.cursors.shift),
        };
    }

}
