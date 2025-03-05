# Agar3D

A 3D browser-based multiplayer game inspired by Agar.io, built with Three.js.

## Project Overview

Agar3D reimagines the classic Agar.io gameplay in a full 3D environment. Players navigate a three-dimensional space, consuming smaller entities to grow while avoiding being consumed by larger players.

### Key Features

- Full 3D movement and environment
- Multiplayer gameplay via WebSockets
- Cross-platform support (desktop and mobile browsers)
- Growth and splitting mechanics
- Real-time leaderboards

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16.x or higher recommended)
- npm or [yarn](https://yarnpkg.com/)
- Modern web browser with WebGL support
- Basic knowledge of JavaScript/HTML/CSS
- (Optional) [Git](https://git-scm.com/) for version control

### Installation

1. Clone the repository or download the source code:
   ```
   git clone https://github.com/yourusername/agar3d.git
   cd agar3d
   ```

2. Install dependencies:
   ```
   npm install
   ```
   or
   ```
   yarn install
   ```

### Quick Start

The project includes a startup script (`start.sh`) for easy development. Make sure to make it executable first:

```bash
chmod +x start.sh
```

Available commands:

```bash
# Start development server only
./start.sh -d
# or
./start.sh --dev

# Start backend server only
./start.sh -s
# or
./start.sh --server

# Start both servers (if supported by your system)
./start.sh -b
# or
./start.sh --both

# Install/reinstall dependencies
./start.sh -i
# or
./start.sh --install

# Show help
./start.sh -h
# or
./start.sh --help
```

If you prefer using npm directly:

```bash
# Start development server
npm run dev

# Start backend server
npm run server
```

4. Open your browser and navigate to `http://localhost:3000` (or the port specified in the console)

## Controls

### Keyboard Controls
- **W, A, S, D** or **Arrow Keys**: Move your cell in 3D space
- **Space**: Split your cell (when large enough)
- **E**: Eject mass
- **Shift**: Boost (uses mass)
- **Q**: Toggle camera mode
- **ESC**: Open game menu

### Mouse Controls
- **Mouse Movement**: Control direction
- **Left Click**: Move toward cursor
- **Right Click**: Split toward cursor
- **Scroll Wheel**: Zoom in/out

### Mobile Controls
- **Drag**: Move in direction
- **Double Tap**: Split
- **Two-finger Pinch**: Zoom in/out
- **Two-finger Tap**: Eject mass
- **Three-finger Tap**: Open menu

## Project Structure

```
agar3d/
├── package.json                # Root project configuration
│
├── client/
│   ├── index.html              # Main HTML file
│   ├── package.json            # Client dependencies
│   ├── vite.config.js          # Vite bundler configuration
│   │
│   ├── css/
│   │   └── style.css           # Main CSS styles
│   │
│   └── js/
│       ├── app.js              # Main client entry point
│       │
│       ├── game/
│       │   ├── index.js        # Game initialization and main loop
│       │   ├── player.js       # Player class with movement and rendering
│       │   ├── food.js         # Food class for collectible items
│       │   ├── camera.js       # Camera controller for player following
│       │   ├── physics.js      # Client-side physics and collision detection
│       │   └── rendering.js    # Visual effects and rendering optimizations
│       │
│       ├── networking/
│       │   └── socket.js       # WebSocket client implementation
│       │
│       └── ui/
│           └── ui.js           # User interface components
│
└── server/
    ├── index.js                # Main server entry point
    ├── package.json            # Server dependencies
    │
    └── game/
        ├── gameServer.js       # Main game server logic
        ├── serverPlayer.js     # Server-side player implementation
        ├── serverFood.js       # Server-side food implementation
        └── physics.js          # Server-side physics system
```

## Development Workflow

1. **Client Development**: Focus on the Three.js implementation in `src/client/`
2. **Server Development**: Implement game logic and multiplayer in `src/server/`
3. **Testing**: Test locally with multiple browser windows
4. **Deployment**: Deploy client to static hosting and server to a Node.js hosting service

## Core Technologies

- [Three.js](https://threejs.org/) - 3D graphics library
- [Socket.io](https://socket.io/) or [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) - Real-time communication
- [Webpack](https://webpack.js.org/) or [Vite](https://vitejs.dev/) - Bundling and development
- (Optional) [TypeScript](https://www.typescriptlang.org/) - Type safety

## Roadmap

1. **Phase 1**: Basic 3D environment and single-player controls
2. **Phase 2**: Core game mechanics (growth, collision, food)
3. **Phase 3**: Multiplayer functionality
4. **Phase 4**: Mobile optimization
5. **Phase 5**: Visual polish and performance optimization

## Resources

- [Three.js Documentation](https://threejs.org/docs/)
- [Three.js Examples](https://threejs.org/examples/)
- [Original Agar.io Game](https://agar.io/)
- [WebGL Fundamentals](https://webglfundamentals.org/)
- [Socket.io Documentation](https://socket.io/docs/v4/)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
