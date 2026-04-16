import '@testing-library/jest-native/extend-expect';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Reanimated 2/3/4 mock recommended for Jest.
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

