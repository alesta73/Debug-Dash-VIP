import Phaser from "phaser";

// Import scenes for use in the game
import PreloadScene from "./scenes/PreloadScene";
import GameScene from "./scenes/GameScene";

// Phaser game configuration
var config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, // Automatically choose the rendering type
  width: 320, height: 180, 
  // width: 1920, height: 1080,
  
  // Render settings for a pixel-art style
  pixelArt: true,
  render: { pixelArt: true },

  fps: {
    target: 60,
  },

  // Physics settings for the game
  physics: {
    default: 'arcade', // Use Arcade Physics
    arcade: {
      gravity: { y: 900, x: 0 }, // Set global gravity
      debug: false// Enable physics debugging
    }
  },

  // Scale settings to fit the game to the screen
  scale: {
    mode: Phaser.Scale.FIT, // Fit the game to the screen while maintaining aspect ratio
    autoCenter: Phaser.Scale.CENTER_BOTH // Center the game horizontally and vertically
  },

  // Scene registration: defines the order of scene execution
  scene: [PreloadScene, GameScene],
};

// Create a new Phaser game instance
var game = new Phaser.Game(config);
