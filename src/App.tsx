import { Route, Routes } from "react-router-dom";
import { HomePage } from "@/pages/HomePage";
import { SharePage } from "@/pages/SharePage";
import { Layout } from "@/components/Layout";

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/share/:id" element={<SharePage />} />
      </Routes>
    </Layout>
  );
}
