export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "grid", gap: 10 }}><div className="sk" style={{ width: 140, height: 12 }} /><div className="sk" style={{ width: 260, height: 30 }} /></div>
      <div className="grid">
        <div className="sk s12" style={{ height: 200, borderRadius: 28 }} />
        <div className="sk s8" style={{ height: 320, borderRadius: 22 }} />
        <div className="sk s4" style={{ height: 320, borderRadius: 22 }} />
      </div>
    </div>
  );
}
