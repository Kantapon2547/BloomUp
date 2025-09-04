import { useState } from "react";
import { Login } from "./components/Login";
import Home from "./pages/Home"; // new home page

function App() {
  const [user, setUser] = useState(null);

  return (
    <div className="App">
      {!user ? <Login onLoginSuccess={setUser} /> : <Home user={user} />}
    </div>
  );
}

export default App;
