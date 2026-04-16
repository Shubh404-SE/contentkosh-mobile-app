import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ROUTES } from '../constants/navigation';

type IonName = ComponentProps<typeof Ionicons>['name'];

type TabIconPair = { outline: IonName; solid: IonName };

const TAB_ICONS: Record<string, TabIconPair> = {
  [ROUTES.TABS.HOME]: { outline: 'home-outline', solid: 'home' },
  [ROUTES.TABS.BATCHES]: { outline: 'layers-outline', solid: 'layers' },
  [ROUTES.TABS.TESTS]: { outline: 'clipboard-outline', solid: 'clipboard' },
  [ROUTES.TABS.CONTENT]: { outline: 'folder-open-outline', solid: 'folder-open' },
  [ROUTES.TABS.ANNOUNCEMENTS]: { outline: 'megaphone-outline', solid: 'megaphone' },
  [ROUTES.TABS.MORE]: { outline: 'menu-outline', solid: 'menu' },
};

const TAB_FALLBACK: TabIconPair = { outline: 'help-circle-outline', solid: 'help-circle' };

export function tabBarIconFor(routeName: string) {
  const pair = TAB_ICONS[routeName] ?? TAB_FALLBACK;
  return ({
    color,
    size,
    focused,
  }: {
    color: string;
    size: number;
    focused: boolean;
  }) => <Ionicons name={focused ? pair.solid : pair.outline} size={size} color={color} />;
}

const DRAWER_ICONS: Partial<Record<string, IonName>> = {
  [ROUTES.APP.DRAWER_ANNOUNCEMENTS]: 'megaphone-outline',
  [ROUTES.APP.DRAWER_EXAMS]: 'school-outline',
  [ROUTES.APP.DRAWER_COURSES]: 'book-outline',
  [ROUTES.APP.DRAWER_STUDENTS]: 'people-outline',
  [ROUTES.APP.DRAWER_ADMIN_USERS]: 'shield-checkmark-outline',
  [ROUTES.APP.DRAWER_SETTINGS]: 'settings-outline',
};

export function drawerIconForRoute(routeName: string): IonName {
  return DRAWER_ICONS[routeName] ?? 'ellipse-outline';
}
