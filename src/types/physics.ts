import Phaser from "phaser";

export interface MovementIntent {
    x: number;   // -1, 0, 1
    y: number;             // -1, 0, 1
    jump: boolean;         // Is button held down?
    jumpJustPressed: boolean; // Was button pressed this frame?
    dash: boolean;
    dashJustPressed: boolean;
}

export interface IMovableBody {
    active: boolean;
    body: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | null;
    
    // Methods used by MovementComponent
    setDragX(value: number): this;
    setVelocityX(value: number): this;
    setVelocityY(value: number): this;
    setFlipX(value: boolean): this;
}