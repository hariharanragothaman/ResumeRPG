import { useState } from "react";
import { Route, Routes } from "react-router-dom";
import { HomePage } from "@/pages/HomePage";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { SharePage } from "@/pages/SharePage";
import { Layout } from "@/components/Layout";
import type { ThemeName } from "@/lib/config";

export function App() {
  const [theme, setTheme] = useState<ThemeName>(
    () => (localStorage.getItem("resumerpg:theme") as ThemeName) || "fantasy",
  );

  const changeTheme = (t: ThemeName) => {
    setTheme(t);
    localStorage.setItem("resumerpg:theme", t);
  };

  return (
    <Layout theme={theme}>
      <Routes>
        <Route path="/" element={<HomePage theme={theme} onThemeChange={changeTheme} />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/share/:id" element={<SharePage />} />
      </Routes>
    </Layout>
  );
}
