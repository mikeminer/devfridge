export const metadata = {
  title: "Cold Storage Demo · DevFridge World",
  description: "Play a 60-second demonstration of DevFridge World's Cold Storage game. No wallet or timelock is required.",
  robots: { index: false, follow: false },
};

export default function WorldDemoPage() {
  return (
    <main style={{ position: "fixed", inset: 0, zIndex: 2147483647, background: "#171b18" }}>
      <iframe
        src="/demo/index.html"
        title="DevFridge World · Cold Storage 60-second demo"
        allow="autoplay; fullscreen; gamepad"
        style={{ display: "block", width: "100%", height: "100dvh", border: 0 }}
      />
    </main>
  );
}
