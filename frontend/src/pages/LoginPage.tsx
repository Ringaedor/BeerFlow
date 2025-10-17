import { LoginForm } from "../components/LoginForm";

export const LoginPage = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Login</h1>
        </div>
        <div className="mt-4">
          <LoginForm />
        </div>
      </div>
    </div>
  );
};