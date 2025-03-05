### Prereqs

- Node.js v16.x or higher
- npm or yarn
- Browser with WebGL support

### Installation

1. Clone this repository:
   ```
   git clone https://github.com/ethanbleier/agar3d.git
   cd agar3d
   ```

2. Install dependencies:
   ```
   npm run setup
   ```
   This will install dependencies for the root project, client, and server.

### Quick Start

The project includes a startup script (`start.sh`) for easy development on macOS and Linux. For Windows users, equivalent npm commands are provided below.

#### macOS/Linux:
Make sure to make the startup script executable first:

```bash
chmod +x start.sh
```

Available commands:

```bash
# Start client development server only
./start.sh -c
# or
./start.sh --client

# Start server only
./start.sh -s
# or
./start.sh --server

# Start server in development mode (with nodemon)
./start.sh -d
# or
./start.sh --server-dev

# Start both client and server (default)
./start.sh -b
# or
./start.sh --both

# Preview the built client with server running
./start.sh -p
# or
./start.sh --preview

# Install/reinstall dependencies
./start.sh -i
# or
./start.sh --install

# Show above help
./start.sh -h
# or
./start.sh --help
```

#### For Windows users:
Windows users can use the following npm commands directly:

```bash
# Install all dependencies (run this first)
npm run setup

# Start both client and server
npm start

# Start client development server only
npm run client

# Start server only
npm run server

# Start server in development mode
npm run server:dev

# Build client for production
npm run build

# Preview built client with server
npm run preview
```

Follow console output to open game in browser

## Desktop Controls

- **W**: Dash (uses 3 mass)
- **C**: Toggle camera view angle
- **ESC** or **L**: Open game menu
- **Mouse**: Control direction / blog always moves toward mouse
- **Scroll**: Zoom in/out

## Project Structure

```
agar3d/
├── package.json                # Root project configuration
├── package-lock.json           # Dependency lock file
├── start.sh                    # Startup script for development
├── vite.config.js              # Vite configuration for the project
│
├── client/                     # Client-side code
│   ├── index.html              # Main HTML file
│   ├── package.json            # Client dependencies
│   ├── vite.config.js          # Vite bundler configuration
│   │
│   ├── css/                    # CSS styles
│   │   └── style.css           # Main CSS styles
│   │
│   └── js/                     # Client JavaScript
│       ├── app.js              # Main client entry point
│       │
│       ├── game/               # Game logic
│       │   ├── index.js        # Game initialization and main loop
│       │   ├── player.js       # Player class with movement and rendering
│       │   ├── food.js         # Food class for collectible items
│       │   ├── camera.js       # Camera controller for player following
│       │   ├── physics.js      # Client-side physics and collision detection
│       │   └── rendering.js    # Visual effects and rendering optimizations
│       │
│       ├── networking/         # Network communication
│       │   └── socket.js       # WebSocket client implementation
│       │
│       └── ui/                 # User interface components
│           └── ui.js           # User interface components
│
└── server/                     # Server-side code
    ├── index.js                # Main server entry point
    ├── package.json            # Server dependencies
    │
    └── game/                   # Server game logic
        ├── gameServer.js       # Main game server logic
        ├── serverPlayer.js     # Server-side player implementation
        ├── serverFood.js       # Server-side food implementation
        └── physics.js          # Server-side physics system
```


1. **Client Development**: Focus on the Three.js implementation in `client/js/`
2. **Server Development**: Implement game logic and multiplayer in `server/game/`

## Relevant links

- [Three.js Docs](https://threejs.org/docs/)
- [Three.js Examples](https://threejs.org/examples/)
- [WebGL](https://webglfundamentals.org/)
- [Socket.io Docs](https://socket.io/docs/v4/)
- [Three.js](https://threejs.org/)
- [Socket.io](https://socket.io/)
- [Express](https://expressjs.com/)
- [Vite](https://vitejs.dev/)
- [Node.js](https://nodejs.org/)

## License

MIT License
