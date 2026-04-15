import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Legacy route — redirect to /login
const LegacyRedirect = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/login", { replace: true });
  }, [navigate]);
  return null;
};

export default LegacyRedirect;
