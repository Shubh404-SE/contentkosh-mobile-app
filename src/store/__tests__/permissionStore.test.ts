import { act } from '@testing-library/react-native';
import { usePermissionStore } from '../permissionStore';

describe('permissionStore.hasAll', () => {
  afterEach(() => {
    usePermissionStore.setState({ permissions: [], isLoading: false, error: null });
  });

  test('returns true when required is empty', () => {
    expect(usePermissionStore.getState().hasAll([])).toBe(true);
  });

  test('returns false when no permissions are loaded', () => {
    expect(usePermissionStore.getState().hasAll(['X'])).toBe(false);
  });

  test('returns true only when all required permissions exist', () => {
    act(() => {
      usePermissionStore.setState({ permissions: ['A', 'B'], isLoading: false, error: null });
    });
    expect(usePermissionStore.getState().hasAll(['A'])).toBe(true);
    expect(usePermissionStore.getState().hasAll(['A', 'B'])).toBe(true);
    expect(usePermissionStore.getState().hasAll(['A', 'C'])).toBe(false);
  });
});

