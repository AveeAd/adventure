import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

// Bottom-tab shell for the four signed-in top-level destinations - see
// MOBILE_PLAN.md Phase 2. Adventure/trip-report detail screens live outside
// this group (app/adventures/...) since they're reached from Discover's
// list/search, not their own tab.
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2f6b4f',
        tabBarInactiveTintColor: '#8ebe9d',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, size }) => <Ionicons name="compass-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="guides"
        options={{
          title: 'Guides',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="clubs"
        options={{
          title: 'Clubs',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
