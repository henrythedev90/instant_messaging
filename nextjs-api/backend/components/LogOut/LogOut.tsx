import { useAuth } from "../../hooks/AuthContext";

export default function LogOut() {
  const { logout } = useAuth();
  return <button onClick={logout}>Log Out</button>;
}
