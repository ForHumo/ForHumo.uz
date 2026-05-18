export default function AIPage() {
  return (
    <iframe
      src="/ai-static/"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        border: "none",
        zIndex: 9999,
      }}
      allow="microphone; camera"
    />
  );
}