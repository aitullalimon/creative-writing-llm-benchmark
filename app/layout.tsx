import "./globals.css";

export const metadata = {
  title: "Joshua · Creative Writing Benchmark",
  description: "Benchmark creative-writing outputs across models via LiteLLM",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
