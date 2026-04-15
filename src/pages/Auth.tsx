import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Legacy route — redirect to unified auth
const Auth = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/ingresar", { replace: true });
  }, [navigate]);
  return null;
};

export default Auth;
