import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Home from "./pages/Home";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/home" element={<Home />} />

        <Route path="/" element={<Signup />} />

        <Route path="/login" element={<Login />} />

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}