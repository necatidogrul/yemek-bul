# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Yemek Bulucu - AI-powered recipe discovery app that suggests recipes based on available ingredients. Built with React Native/Expo, uses OpenAI for recipe generation and Supabase for backend services.

## Development Commands

### Environment Management
- `npm run env:dev` - Development environment
- `npm run env:test` - Testing environment  
- `npm run env:prod` - Production environment

### Development
- `npm start` or `expo start` - Start development server
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS  
- `npm run web` - Run on web

### Code Quality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format with Prettier
- `npm run typecheck` - TypeScript type checking

### Building & Deployment
- `npm run build:production` - Build for production (all platforms)
- `npm run build:ios` - Build iOS production
- `npm run build:android` - Build Android production
- `npm run submit:ios` - Submit to App Store
- `npm run submit:android` - Submit to Google Play

## Architecture

### Core Structure
- **Context Providers**: Theme, Toast, Tour, Language, Haptic contexts wrap the app
- **Navigation**: Bottom tab navigation with themed navigators
- **Onboarding**: First-run experience with user preference collection
- **Environment Config**: Development/testing/production environment switching

### Key Services
- **OpenAIService**: AI recipe generation with intelligent prompting and image search
- **RevenueCatService**: Subscription/premium features management
- **FavoritesService**: Recipe bookmarking with AsyncStorage
- **UserPreferencesService**: User settings and onboarding state
- **Supabase**: Backend services (database, edge functions)

### AI Recipe Generation Flow
1. User inputs ingredients
2. OpenAIService builds contextual prompt based on user preferences and history
3. Uses adaptive strategy (conservative/balanced/adventurous) based on user experience
4. Fetches recipe images via Google Custom Search API or Unsplash fallback
5. Returns structured Recipe objects with metadata

### Theming System
- Light/dark theme support
- Consistent design tokens in `src/theme/design-tokens.ts`
- Themed components with `useThemedStyles` hook

### Localization
- i18next for internationalization
- Turkish and English support
- Language switching via LanguageContext

### State Management
- Context-based state management (no Redux)
- AsyncStorage for persistence
- Individual services handle their own state

## Key Configuration

### Environment Variables
- `EXPO_PUBLIC_ENVIRONMENT`: development/testing/production
- `EXPO_PUBLIC_OPENAI_API_KEY`: Direct OpenAI API (development only)
- `EXPO_PUBLIC_SUPABASE_URL`: Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key

### Build Profiles (eas.json)
- Development: Development client build
- Preview: Internal distribution
- Production: App Store/Google Play builds

### Module Resolution
Babel alias configured: `@` -> `./src`

## Testing Notes
- Tests not yet implemented (test script exists but returns placeholder)
- Development mode forces onboarding reset for testing
- Environment switching available via npm scripts

## Important Files
- `App.tsx` - Main app entry point with provider hierarchy
- `src/config/environment.ts` - Environment detection and configuration
- `src/services/openaiService.ts` - Core AI recipe generation logic
- `src/components/navigation/ThemedNavigators.tsx` - Navigation structure
- `package.json` - Available scripts and dependencies