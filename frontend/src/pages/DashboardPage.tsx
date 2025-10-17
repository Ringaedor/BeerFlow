import { useAuthStore } from "../store/auth.store";

export const DashboardPage = () => {
  const { logout, user } = useAuthStore();
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Dashboard Page (Protected)</h1>
      <p>Welcome, {user?.email}</p>
      <button
        onClick={logout}
        className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Logout
      </button>
    </div>
  );
};