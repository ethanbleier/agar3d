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

3. Start the development server:
   ```
   npm run dev
   ```
   or
   ```
   yarn dev
   ```

4. Open your browser and navigate to `http://localhost:3000` (or the port specified in the console)

## Project Structure

```
agar3d/
├── public/              # Static assets
│   ├── assets/          # Game assets (textures, models, sounds)
│   └── index.html       # Main HTML file
├── src/                 # Source code
│   ├── client/          # Client-side code
│   │   ├── components/  # Game components
│   │   ├── core/        # Core game functionality
│   │   ├── rendering/   # Three.js rendering code
│   │   └── index.js     # Client entry point
│   ├── server/          # Server-side code (for multiplayer)
│   │   ├── game/        # Game logic
│   │   └── index.js     # Server entry point
│   └── shared/          # Code shared between client and server
│       ├── config.js    # Game configuration
│       └── utils/       # Utility functions
├── .gitignore           # Git ignore file
├── package.json         # Project dependencies and scripts
└── README.md            # Project documentation
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
