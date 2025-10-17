import { useForm } from 'react-hook-form';
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
  const login = useAuthStore((state) => state.login);

  const onSubmit = async (values: any) => {
    try {
      const { data } = await apiClient.post('/auth/login', values);
      const decodedUser: any = jwt_decode(data.access_token);
      login(data.access_token, { id: decodedUser.sub, email: decodedUser.email, role: decodedUser.role });
      navigate('/');
    } catch (error) {
      alert('Invalid credentials or server error.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="email@example.com"
          {...register('email', { required: 'Email is required' })}
        />
        {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email.message as string}</p>}
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          id="password"
          type="password"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          {...register('password', { required: 'Password is required' })}
        />
        {errors.password && <p className="mt-2 text-sm text-red-600">{errors.password.message as string}</p>}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        {isSubmitting ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
};