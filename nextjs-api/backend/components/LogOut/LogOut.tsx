import { useAuth } from "../auth/AuthContext";

export default function LogOut() {
  const { logout } = useAuth();
  return <button onClick={logout}>Log Out</button>;
}
