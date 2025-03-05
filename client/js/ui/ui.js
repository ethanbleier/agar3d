// User interface handling

export class UI {
    constructor() {
        this.elements = {
            startScreen: document.getElementById('start-screen'),
            gameUI: document.getElementById('game-ui'),
            leaderboard: document.getElementById('leaderboard'),
            stats: document.getElementById('stats'),
            messages: document.getElementById('messages'),
            usernameInput: document.getElementById('username-input'),
            startButton: document.getElementById('start-button')
        };
        
        // Create UI elements if they don't exist
        this.createUIElements();
    }
    
    createUIElements() {
        // Create start screen if it doesn't exist
        if (!this.elements.startScreen) {
            this.elements.startScreen = document.createElement('div');
            this.elements.startScreen.id = 'start-screen';
            this.elements.startScreen.classList.add('screen');
            this.elements.startScreen.innerHTML = `
                <div class="start-container">
                    <h1>Agar3D</h1>
                    <p>A 3D multiplayer game inspired by Agar.io</p>
                    <div class="input-group">
                        <input type="text" id="username-input" placeholder="Enter your username" maxlength="15">
                        <button id="start-button">Play</button>
                    </div>
                    <div class="instructions">
                        <h2>How to Play</h2>
                        <ul>
                            <li>Move: WASD or Arrow Keys</li>
                            <li>Up/Down: Space / Shift</li>
                            <li>Split: Space Bar</li>
                            <li>Boost: Left Click</li>
                            <li>Zoom: Mouse Wheel</li>
                        </ul>
                    </div>
                </div>
            `;
            document.body.appendChild(this.elements.startScreen);
            this.elements.usernameInput = document.getElementById('username-input');
            this.elements.startButton = document.getElementById('start-button');
        }
        
        // Create game UI if it doesn't exist
        if (!this.elements.gameUI) {
            this.elements.gameUI = document.createElement('div');
            this.elements.gameUI.id = 'game-ui';
            this.elements.gameUI.classList.add('game-ui');
            this.elements.gameUI.innerHTML = `
                <div id="leaderboard" class="leaderboard">
                    <h3>Leaderboard</h3>
                    <ol id="leaderboard-list"></ol>
                </div>
                <div id="stats" class="stats">
                    <div>Mass: <span id="player-mass">1</span></div>
                    <div>Rank: <span id="player-rank">-</span></div>
                </div>
                <div id="messages" class="messages"></div>
            `;
            document.body.appendChild(this.elements.gameUI);
            this.elements.leaderboard = document.getElementById('leaderboard');
            this.elements.stats = document.getElementById('stats');
            this.elements.messages = document.getElementById('messages');
        }
        
        // Create game container if it doesn't exist
        if (!document.getElementById('game-container')) {
            const gameContainer = document.createElement('div');
            gameContainer.id = 'game-container';
            document.body.appendChild(gameContainer);
        }
        
        // Add basic styles
        this.addStyles();
    }
    
    addStyles() {
        if (!document.getElementById('agar3d-styles')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'agar3d-styles';
            styleSheet.innerHTML = `
                body, html {
                    margin: 0;
                    padding: 0;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    font-family: Arial, sans-serif;
                }
                
                #game-container {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 1;
                }
                
                .screen {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background-color: rgba(0, 0, 64, 0.85);
                    z-index: 10;
                }
                
                .start-container {
                    background-color: rgba(255, 255, 255, 0.9);
                    border-radius: 10px;
                    padding: 30px;
                    text-align: center;
                    max-width: 500px;
                }
                
                .input-group {
                    margin: 20px 0;
                }
                
                #username-input {
                    padding: 10px;
                    font-size: 18px;
                    border: 2px solid #ccc;
                    border-radius: 5px;
                    margin-right: 10px;
                }
                
                #start-button {
                    padding: 10px 20px;
                    font-size: 18px;
                    background-color: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                }
                
                #start-button:hover {
                    background-color: #45a049;
                }
                
                .instructions {
                    text-align: left;
                    margin-top: 20px;
                }
                
                .instructions ul {
                    padding-left: 20px;
                }
                
                .game-ui {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    z-index: 5;
                    display: none;
                }
                
                .leaderboard {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background-color: rgba(255, 255, 255, 0.8);
                    border-radius: 5px;
                    padding: 10px;
                    width: 200px;
                }
                
                .leaderboard h3 {
                    margin: 0 0 10px 0;
                    text-align: center;
                }
                
                .leaderboard ol {
                    margin: 0;
                    padding-left: 25px;
                }
                
                .stats {
                    position: absolute;
                    bottom: 10px;
                    left: 10px;
                    background-color: rgba(255, 255, 255, 0.8);
                    border-radius: 5px;
                    padding: 10px;
                }
                
                .messages {
                    position: absolute;
                    top: 10px;
                    left: 10px;
                    width: 300px;
                }
                
                .message {
                    background-color: rgba(255, 255, 255, 0.8);
                    border-radius: 5px;
                    padding: 10px;
                    margin-bottom: 5px;
                    animation: fadeOut 5s forwards;
                }
                
                @keyframes fadeOut {
                    0% { opacity: 1; }
                    70% { opacity: 1; }
                    100% { opacity: 0; }
                }
            `;
            document.head.appendChild(styleSheet);
        }
    }
    
    showStartScreen() {
        if (this.elements.startScreen) {
            this.elements.startScreen.style.display = 'flex';
        }
        
        if (this.elements.gameUI) {
            this.elements.gameUI.style.display = 'none';
        }
    }
    
    hideStartScreen() {
        if (this.elements.startScreen) {
            this.elements.startScreen.style.display = 'none';
        }
    }
    
    showGameUI() {
        if (this.elements.gameUI) {
            this.elements.gameUI.style.display = 'block';
        }
    }
    
    hideGameUI() {
        if (this.elements.gameUI) {
            this.elements.gameUI.style.display = 'none';
        }
    }
    
    updateLeaderboard(leaderboard) {
        const leaderboardList = document.getElementById('leaderboard-list');
        if (!leaderboardList) return;
        
        // Clear the leaderboard
        leaderboardList.innerHTML = '';
        
        // Add each player to the leaderboard
        leaderboard.forEach((player) => {
            const listItem = document.createElement('li');
            
            // Don't add player rank to avoid duplication with <ol> automatic numbering
            // Remove trailing " 1" from username if present
            const displayUsername = player.username.replace(/ 1$/, '');
            listItem.textContent = `${displayUsername} (${player.mass})`;
            
            // Highlight the local player
            if (player.isLocalPlayer) {
                listItem.style.fontWeight = 'bold';
                
                // Update player stats
                document.getElementById('player-mass').textContent = player.mass;
                document.getElementById('player-rank').textContent = player.rank;
            }
            
            leaderboardList.appendChild(listItem);
        });
    }
    
    showMessage(message, type = 'info') {
        if (!this.elements.messages) return;
        
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', type);
        messageElement.textContent = message;
        
        this.elements.messages.appendChild(messageElement);
        
        // Remove message after animation ends
        setTimeout(() => {
            messageElement.remove();
        }, 5000);
    }
    
    updateStats(mass, rank) {
        document.getElementById('player-mass').textContent = mass;
        document.getElementById('player-rank').textContent = rank;
    }
    
    showGameOver(stats) {
        // Create game over screen
        const gameOverScreen = document.createElement('div');
        gameOverScreen.id = 'game-over-screen';
        gameOverScreen.classList.add('screen');
        gameOverScreen.innerHTML = `
            <div class="start-container">
                <h1>Game Over</h1>
                <p>You were eaten!</p>
                <div class="stats-summary">
                    <p>Final Mass: ${stats.mass}</p>
                    <p>Final Rank: ${stats.rank}</p>
                    <p>Time Survived: ${stats.timeSurvived}</p>
                    <p>Players Eaten: ${stats.playersEaten}</p>
                </div>
                <button id="play-again-button">Play Again</button>
            </div>
        `;
        document.body.appendChild(gameOverScreen);
        
        // Add event listener to play again button
        document.getElementById('play-again-button').addEventListener('click', () => {
            gameOverScreen.remove();
            this.showStartScreen();
        });
    }
}