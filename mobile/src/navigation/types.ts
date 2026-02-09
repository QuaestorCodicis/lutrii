/**
 * Navigation Types
 *
 * TypeScript types for React Navigation
 */

import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type {
  CompositeScreenProps,
  NavigatorScreenParams,
} from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

// Root Stack Navigator
export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  CreateSubscription: {
    merchantPublicKey?: string;
    merchantName?: string;
    prefilled?: {
      amount?: number;
      frequency?: number;
      merchantName?: string;
    };
  };
  SubscriptionDetails: {
    subscriptionId: string;
  };
  MerchantDetails: {
    merchantPublicKey: string;
  };
  ScanQR: undefined;
  Settings: undefined;
  EditSubscription: {
    subscriptionId: string;
  };
  PaymentHistory: {
    subscriptionId: string;
  };
};

// Main Tab Navigator
export type MainTabParamList = {
  Home: undefined;
  Subscriptions: undefined;
  Merchants: undefined;
  Analytics: undefined;
  Profile: undefined;
};

// Screen Props Types
export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

// Type helper for navigation prop
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
