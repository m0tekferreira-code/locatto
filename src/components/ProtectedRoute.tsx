import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAccountId } from "@/hooks/useAccountId";
import { useLocation } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const { accountId, loading: accountLoading } = useAccountId();
  const location = useLocation();

  if (loading || accountLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!accountId && location.pathname !== "/completar-cadastro") {
    return <Navigate to="/completar-cadastro" replace />;
  }

  if (accountId && location.pathname === "/completar-cadastro") {
    return <Navigate to="/" replace />;
  }

  // Allow access even with expired license (read-only mode)
  return <>{children}</>;
};

export default ProtectedRoute;
