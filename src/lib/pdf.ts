declare global {
  interface Window {
    pdfjsLib?: {
      GlobalWorkerOptions: { workerSrc: string };
      getDocument: (opts: { data: ArrayBuffer }) => {
        promise: Promise<{
          numPages: number;
          getPage: (n: number) => Promise<{
            getTextContent: () => Promise<{
              items: { str: string }[];
            }>;
          }>;
        }>;
      };
    };
  }
}

async function loadPdfJs(): Promise<boolean> {
  if (window.pdfjsLib) return true;
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    s.onload = () => {
      window.pdfjsLib!.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      resolve(true);
    };
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

export async function extractPdfText(file: File): Promise<string> {
  const ok = await loadPdfJs();
  if (!ok) throw new Error("PDF library failed to load");
  const buf = await file.arrayBuffer();
  const pdf = await window.pdfjsLib!.getDocument({ data: buf }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => item.str).join(" ") + "\n";
  }
  return text;
}
