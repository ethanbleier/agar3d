#!/bin/bash

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for required dependencies
echo -e "${YELLOW}Checking dependencies...${NC}"

if ! command_exists node; then
    echo -e "${RED}Node.js is not installed. Please install Node.js to continue.${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}npm is not installed. Please install npm to continue.${NC}"
    exit 1
fi

# Function to start development server
start_dev() {
    echo -e "${GREEN}Starting development server...${NC}"
    npm run dev
}

# Function to start backend server
start_server() {
    echo -e "${GREEN}Starting backend server...${NC}"
    npm run server
}

# Function to install dependencies
install_deps() {
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
}

# Function to show help
show_help() {
    echo "Usage: ./start.sh [option]"
    echo "Options:"
    echo "  -d, --dev     Start development server only"
    echo "  -s, --server  Start backend server only"
    echo "  -b, --both    Start both development and backend servers"
    echo "  -i, --install Install dependencies"
    echo "  -h, --help    Show this help message"
}

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}node_modules not found. Installing dependencies...${NC}"
    install_deps
fi

# Process command line arguments
case "$1" in
    -d|--dev)
        start_dev
        ;;
    -s|--server)
        start_server
        ;;
    -b|--both)
        # Start both servers in separate terminals if possible
        if command_exists gnome-terminal; then
            gnome-terminal -- bash -c "npm run server; exec bash"
            start_dev
        elif command_exists osascript; then
            # macOS approach
            osascript -e "tell app \"Terminal\" to do script \"cd '$(pwd)' && npm run server\""
            start_dev
        else
            echo -e "${YELLOW}Cannot open multiple terminals automatically.${NC}"
            echo -e "${YELLOW}Please run the servers in separate terminals:${NC}"
            echo "Terminal 1: npm run server"
            echo "Terminal 2: npm run dev"
        fi
        ;;
    -i|--install)
        install_deps
        ;;
    -h|--help)
        show_help
        ;;
    *)
        echo -e "${YELLOW}No option specified, starting development server...${NC}"
        start_dev
        ;;
esac
