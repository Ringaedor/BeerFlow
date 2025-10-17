import { Box, Flex, Heading } from "@chakra-ui/react";
import { LoginForm } from "../components/LoginForm";

export const LoginPage = () => {
  return (
    <Flex minH="100vh" align="center" justify="center">
      <Box p={8} borderWidth={1} borderRadius={8} boxShadow="lg">
        <Box textAlign="center">
          <Heading>Login</Heading>
        </Box>
        <Box my={4} textAlign="left">
          <LoginForm />
        </Box>
      </Box>
    </Flex>
  );
};