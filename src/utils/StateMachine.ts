// src/utils/StateMachine.ts
export interface IState {
    enter(): void;
    update(time: number, delta: number): void;
    exit(): void;
}

export class StateMachine {
    private currentState: IState | null = null;
    private states: Map<string, IState> = new Map();

    public addState(name: string, state: IState): void {
        this.states.set(name, state);
    }

    public setState(name: string): void {
        if (this.currentState) {
            this.currentState.exit();
        }
        
        this.currentState = this.states.get(name) || null;
        
        if (this.currentState) {
            this.currentState.enter();
        }
    }

    public update(time: number, delta: number): void {
        if (this.currentState) {
            this.currentState.update(time, delta);
        }
    }
}