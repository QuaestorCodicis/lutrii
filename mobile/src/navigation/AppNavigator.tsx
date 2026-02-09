/**
 * App Navigator
 *
 * Main navigation structure for Lutrii
 * Features: Bottom tabs, stack navigation, deep linking
 */

import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { RootStackParamList, MainTabParamList } from './types';

// Import screens (will be created next)
import { HomeScreen } from '@/screens/HomeScreen';
import { SubscriptionsScreen } from '@/screens/SubscriptionsScreen';
import { MerchantsScreen } from '@/screens/MerchantsScreen';
import { AnalyticsScreen } from '@/screens/AnalyticsScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';

// Modals/Additional screens
import { CreateSubscriptionScreen } from '@/screens/CreateSubscriptionScreen';
import { SubscriptionDetailsScreen } from '@/screens/SubscriptionDetailsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * Tab Bar Icon Component
 * Simple text-based icons (can be replaced with react-native-vector-icons)
 */
const TabIcon = ({ focused, icon }: { focused: boolean; icon: string }) => (
  <span style={{ fontSize: 24, opacity: focused ? 1 : 0.5 }}>{icon}</span>
);

/**
 * Main Tabs Navigator
 */
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          height: Platform.OS === 'ios' ? 88 : 64,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#FFFFFF',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
        },
        headerTitleStyle: {
          fontSize: 20,
          fontWeight: '600',
          color: '#1F2937',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="🏠" />,
        }}
      />
      <Tab.Screen
        name="Subscriptions"
        component={SubscriptionsScreen}
        options={{
          title: 'Subscriptions',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="📋" />,
        }}
      />
      <Tab.Screen
        name="Merchants"
        component={MerchantsScreen}
        options={{
          title: 'Merchants',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="🏪" />,
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          title: 'Analytics',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="📊" />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="👤" />,
        }}
      />
    </Tab.Navigator>
  );
};

/**
 * Root Stack Navigator
 */
export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: '600',
            color: '#1F2937',
          },
          headerTintColor: '#007AFF',
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: '#F9FAFB',
          },
        }}
      >
        {/* Main App */}
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />

        {/* Modal Screens */}
        <Stack.Group screenOptions={{ presentation: 'modal' }}>
          <Stack.Screen
            name="CreateSubscription"
            component={CreateSubscriptionScreen}
            options={{
              title: 'New Subscription',
              headerLeft: () => null,
            }}
          />
        </Stack.Group>

        {/* Regular Screens */}
        <Stack.Screen
          name="SubscriptionDetails"
          component={SubscriptionDetailsScreen}
          options={{
            title: 'Subscription Details',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
