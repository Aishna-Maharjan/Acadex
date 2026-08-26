import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Personal from "./pages/Personal";
import Community from "./pages/Community";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/home" element={<Home />} />

        <Route path="/signup" element={<Signup />} />

        <Route path="/" element={<Login />} />

        <Route path="/personal" element={<Personal />} />

        <Route path="/community" element={<Community />} />

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}