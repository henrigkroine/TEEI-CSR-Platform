# Testing Setup for Corp Cockpit Astro

## Required Dependencies

To run the test suite created for PHASECAT least-A-01, you need to install the following testing libraries:

```bash
pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitejs/plugin-react
```

### Dependency Breakdown

- **@testing-library/react**: React component testing utilities
- **@testing-library/jest-dom**: Custom jest matchers for DOM assertions
- **@testing-library/user-event**: Simulate user interactions
- **jsdom**: DOM implementation for testing
- **@vitejs/plugin-react**: Vite plugin for React (required for vitest)

## Running Tests

Once dependencies are installed:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test -- --watch

# Run tests with coverage
pnpm test -- --coverage

# Run specific test file
pnpm test src/components/tenant/TenantSelector.test.tsx
```

## Test Files Created

- `src/components/tenant/TenantSelector.test.tsx` - Component tests
- `src/test/setup.ts` - Global test setup
- `vitest.config.ts` - Vitest configuration

## Configuration

The test configuration is already set up in:

- **vitest.config.ts**: Vitest configuration with jsdom environment and path aliases
- **src/test/setup.ts**: Global test setup with localStorage/sessionStorage mocks

## Test Coverage

Current test suite includes:
- ✅ 11 unit tests for TenantSelector
- ✅ Loading state tests
- ✅ Rendering tests
- ✅ Interaction tests (click, keyboard)
- ✅ Storage persistence tests
- ✅ Accessibility tests

## Future Testing Needs

1. **TenantContext tests**: Test context provider functionality
2. **Integration tests**: Test full tenant selection flow
3. **E2E tests**: Use existing Playwright setup for user journeys
4. **Accessibility tests**: Use existing pa11y-ci for automated a11y checks

## Notes

- Test files use `.test.tsx` extension
- All tests use Vitest with React Testing Library
- Mock data matches production schema
- Tests follow AAA pattern (Arrange, Act, Assert)
