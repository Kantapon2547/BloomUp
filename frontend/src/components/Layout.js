import React from "react";
import Navbar from "./Navbar";

const Layout = ({ children }) => {
  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <>
      <Navbar onLogout={handleLogout} />
      <div style={{ paddingTop: "5rem" }}>{children}</div>
    </>
  );
};

export default Layout;
