# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Project Overview

Yemek Bulucu - AI-powered recipe discovery app that suggests recipes based on available ingredients.
Built with React Native/Expo, uses OpenAI for recipe generation and Supabase for backend services.

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
- `npm run format:check` - Check Prettier formatting
- `npm run typecheck` - TypeScript type checking

### Building & Deployment

- `npm run clean-console` - Remove console logs before production builds
- `npm run build:production` - Build for production (all platforms)
- `npm run build:preview` - Build for internal distribution
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
- **RevenueCatService**: Subscription/premium features management (iOS/Android app purchases)
- **FavoritesService**: Recipe bookmarking with AsyncStorage persistence
- **UserPreferencesService**: User settings, dietary preferences, and onboarding state
- **Supabase**: Backend services (database, edge functions for secure API routing)

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
- `EXPO_PUBLIC_UNSPLASH_API_KEY`: Unsplash API for recipe images
- `EXPO_PUBLIC_GOOGLE_CUSTOM_SEARCH_API_KEY`: Google Custom Search for images
- `EXPO_PUBLIC_GOOGLE_CSE_ID`: Google Custom Search Engine ID
- `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS`: RevenueCat iOS API key
- `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID`: RevenueCat Android API key
- `EXPO_PUBLIC_DEBUG_PREMIUM`: Debug flag for premium features

### Security Architecture

- Development: Uses direct OpenAI API key for testing
- Production: All AI requests routed through Supabase Edge Functions for security
- API keys never exposed in production builds

**CRITICAL SECURITY RULES:**

- NEVER hardcode API keys directly in source code
- ALL API keys MUST be stored in .env files only
- NEVER delete entries from .env files - comment them out instead with clear explanations
- When modifying .env, always explain changes in detail to help maintain security understanding

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

## Development Guidelines

### RevenueCat Integration Notes

- **Expo Go Limitation**: RevenueCat only works with development builds (`eas build --profile development`), not Expo Go
- **Platform Keys**: iOS uses dedicated API key, Android key is currently empty/test
- **Error Handling**: App continues with limited functionality if RevenueCat fails to initialize
- **Debug Mode**: Extensive logging available in development mode

### Code Changes Documentation

- ALWAYS provide detailed explanations of any changes made
- Explain the reasoning behind each modification
- Help maintain understanding of the codebase evolution
- Document any security implications of changes

### UI/UX Patterns

- Dark/light theme support is built-in via ThemeContext
- All components should use `useThemedStyles` hook for consistent theming
- Turkish/English localization via i18next
- Haptic feedback integration throughout the app
- Toast notifications for user feedback
