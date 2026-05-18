export default function AIPage() {
  return (
    <iframe
      src="/ai-static/"
      style={{ width: "100%", height: "100vh", border: "none", display: "block" }}
      allow="microphone; camera"
    />
  );
}