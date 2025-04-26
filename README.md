# Handwriting Exercise Game

A gamified handwriting practice application for children using tablets. The game helps children improve their handwriting skills through interactive exercises with immediate feedback.

## Features

- Interactive drawing with touch support
- Progressive difficulty with shrinking constraint boxes
- Real-time feedback and scoring
- Exercise creation and management
- Star-based rating system for accuracy, strokes, timing, and overall performance
- Browser-based storage for exercises and scores
- Tablet-optimized interface
- Oscillator-based audio feedback

## Progressive Web App

This application can be installed as a PWA on supported devices:

1. Open the application in a supported browser
2. Click the "Install" or "Add to Home Screen" option
3. The app will install and can be used offline

PWA features:

- Offline support
- Home screen installation
- App-like experience
- Automatic updates

## Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/handwriting-exercise.git
   cd handwriting-exercise
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start development server:

   ```bash
   npm run dev
   ```

4. Open in browser:
   The application will be available at `http://localhost:3000` or on your local network for tablet testing.

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run typecheck` - Run TypeScript type checking

## Building for Production

To build the application for production:

1. Run the build command:

   ```bash
   npm run build
   ```

2. The output will be in the `dist` directory, which can be deployed to any static hosting service.

3. To preview the production build locally:

   ```bash
   npm run preview
   ```

## Browser and Device Compatibility

This application is optimized for tablet devices with touch screens:

- **Recommended devices**:
  - iPad (all modern versions)
  - Android tablets (Android 9.0+)
  
- **Supported browsers**:
  - Safari on iOS/iPadOS
  - Chrome on Android
  - Edge/Chrome on Windows tablets
  - Firefox (limited support)

- **Screen orientation**:
  - Works in both portrait and landscape orientations
  - Automatically adjusts layout based on screen size

## Project Structure

```text
src/
├── core/           # Core game logic
│   ├── GameManager.ts      # Central game coordinator
│   ├── DrawingManager.ts   # Drawing functionality
│   └── ScoreManager.ts     # Scoring system
├── services/       # Service implementations
│   ├── AudioManager.ts     # Audio effects
│   ├── StorageManager.ts   # Data persistence
│   └── UIManager.ts        # UI state management
├── types/          # TypeScript types and interfaces
│   └── Exercise.ts         # Core data types
├── styles/         # CSS styles
│   └── main.css            # Main stylesheet
├── utils/          # Utility functions
│   └── EventEmitter.ts     # Event system
└── main.ts         # Application entry point
```

## Key Components

- **GameManager**: Coordinates game flow and logic
- **DrawingManager**: Handles canvas drawing operations and stroke data
- **ScoreManager**: Calculates scores based on comparison to example
- **AudioManager**: Generates oscillator-based sound effects
- **StorageManager**: Manages localStorage for saving/loading exercises
- **UIManager**: Controls UI state, views, and animations

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-new-feature`
3. Make your changes and commit them: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/my-new-feature`
5. Submit a pull request

### Coding Standards

- Follow TypeScript best practices
- Use consistent naming conventions
- Write comprehensive comments
- Add tests for new features
- Ensure cross-browser compatibility

## License

This project is licensed under the ISC License - see the LICENSE file for details.
