import { Box, Button, Text } from "@chakra-ui/react";
import { useAuthStore } from "../store/auth.store";

export const DashboardPage = () => {
  const { logout, user } = useAuthStore();
  return (
    <Box>
      <Text>Dashboard Page (Protected)</Text>
      <Text>Welcome, {user?.email}</Text>
      <Button onClick={logout}>Logout</Button>
    </Box>
  );
};