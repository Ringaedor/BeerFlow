import { useForm } from 'react-hook-form';
import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuthStore } from '../store/auth.store';
import jwt_decode from 'jwt-decode';

export const LoginForm = () => {
  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm();
  const navigate = useNavigate();
  const toast = useToast();
  const login = useAuthStore((state) => state.login);

  const onSubmit = async (values: any) => {
    try {
      const { data } = await apiClient.post('/auth/login', values);
      const decodedUser: any = jwt_decode(data.access_token);
      login(data.access_token, { id: decodedUser.sub, email: decodedUser.email, role: decodedUser.role });
      navigate('/');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Invalid credentials or server error.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Box as="form" onSubmit={handleSubmit(onSubmit)} w="100%" maxW="400px">
      <VStack spacing={4}>
        <FormControl isInvalid={!!errors.email}>
          <FormLabel htmlFor="email">Email Address</FormLabel>
          <Input
            id="email"
            placeholder="email@example.com"
            {...register('email', { required: 'Email is required' })}
          />
          <FormErrorMessage>{errors.email?.message as string}</FormErrorMessage>
        </FormControl>
        <FormControl isInvalid={!!errors.password}>
          <FormLabel htmlFor="password">Password</FormLabel>
          <Input
            id="password"
            type="password"
            {...register('password', { required: 'Password is required' })}
          />
          <FormErrorMessage>{errors.password?.message as string}</FormErrorMessage>
        </FormControl>
        <Button
          mt={4}
          colorScheme="teal"
          isLoading={isSubmitting}
          type="submit"
          w="100%"
        >
          Login
        </Button>
      </VStack>
    </Box>
  );
};