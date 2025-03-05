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

# Function to start client development server only
start_client() {
    echo -e "${GREEN}Starting client development server...${NC}"
    npm run client
}

# Function to start server only
start_server() {
    echo -e "${GREEN}Starting server...${NC}"
    npm run server
}

# Function to start server in development mode
start_server_dev() {
    echo -e "${GREEN}Starting server in development mode...${NC}"
    npm run server:dev
}

# Function to start both client and server
start_both() {
    echo -e "${GREEN}Starting both client and server...${NC}"
    npm start
}

# Function to preview the built client
preview_client() {
    echo -e "${GREEN}Starting preview server with server backend...${NC}"
    npm run preview
}

# Function to install dependencies
install_deps() {
    echo -e "${YELLOW}Installing dependencies for the entire project...${NC}"
    npm run setup
}

# Function to show help
show_help() {
    echo "Usage: ./start.sh [option]"
    echo "Options:"
    echo "  -c, --client    Start client development server only"
    echo "  -s, --server    Start server only"
    echo "  -d, --server-dev Start server in development mode (with nodemon)"
    echo "  -b, --both      Start both client and server (default)"
    echo "  -p, --preview   Preview the built client with server running"
    echo "  -i, --install   Install dependencies for all parts of the project"
    echo "  -h, --help      Show this help message"
}

# Check if node_modules exists in root, client, and server directories
if [ ! -d "node_modules" ] || [ ! -d "client/node_modules" ] || [ ! -d "server/node_modules" ]; then
    echo -e "${YELLOW}Some node_modules not found. Installing dependencies...${NC}"
    install_deps
fi

# Process command line arguments
case "$1" in
    -c|--client)
        start_client
        ;;
    -s|--server)
        start_server
        ;;
    -d|--server-dev)
        start_server_dev
        ;;
    -b|--both)
        start_both
        ;;
    -p|--preview)
        preview_client
        ;;
    -i|--install)
        install_deps
        ;;
    -h|--help)
        show_help
        ;;
    *)
        echo -e "${YELLOW}No option specified, starting both client and server...${NC}"
        start_both
        ;;
esac
