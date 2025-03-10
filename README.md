# BaseCamp Chronicals

A 2D RPG Sci-Fi Survival game with blockchain integration, built with React, Phaser.js, and Express.

## Features

- 2D RPG gameplay with sci-fi survival elements
- Base building and defense mechanics
- Blockchain integration with Base (Coinbase L2)
- Real-time multiplayer interactions
- NFT integration (optional)
- AI-powered NPCs

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MetaMask or Coinbase Wallet browser extension

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd BaseCampChronicals
```

2. Install dependencies:
```bash
npm install
cd client && npm install
cd ..
```

3. Create a `.env` file in the root directory:
```
PORT=3000
CLIENT_URL=http://localhost:5173
JWT_SECRET=your_jwt_secret
```

4. Create a `.env` file in the client directory:
```
VITE_API_URL=http://localhost:3000
VITE_WEB3_NETWORK=base-goerli
```

## Development

To run the development server:

```bash
npm run dev
```

This will start both the backend server and the frontend development server:
- Backend: http://localhost:3000
- Frontend: http://localhost:5173

## Building for Production

```bash
npm run build
```

## Testing

```bash
npm test
```

## Project Structure

```
BaseCampChronicals/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── game/          # Phaser game logic
│   │   ├── components/    # React components
│   │   └── web3/         # Blockchain integration
│   └── public/            # Static assets
├── server/                # Backend Express server
│   ├── routes/           # API routes
│   ├── models/           # Database models
│   └── controllers/      # Business logic
└── docs/                 # Documentation
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 