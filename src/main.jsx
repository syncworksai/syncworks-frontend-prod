import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, useLocation } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import App from "./App";
import PMPropertyCreate from "./pages/PMPropertyCreate";
import "./index.css";

function RoutedApplication() {
  const location = useLocation();

  if (location.pathname.replace(/\/+$/, "") === "/pm/properties/new") {
    return (
      <ProtectedRoute>
        <PMPropertyCreate />
      </ProtectedRoute>
    );
  }

  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <RoutedApplication />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
