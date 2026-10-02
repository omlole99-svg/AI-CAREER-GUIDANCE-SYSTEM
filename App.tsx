import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./services/firebase";
import { loginWithGoogle, logout } from "./services/authService";
import MainApp from "./MainApp";

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return <div style={{ color: "white", padding: 40 }}>Loading...</div>;
  }


  return (
    <MainApp
      isLoggedIn={!!user}
      onLogin={loginWithGoogle}
      onLogout={logout}
    />
  );
  
  
  
};

export default App;
