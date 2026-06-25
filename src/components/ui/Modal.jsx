import { useEffect, useRef } from 'react';

export default function Modal({ children, onClose, width = 420 }) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onCloseRef.current(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg-elev)", border: "1px solid var(--bd)", borderRadius: 14, maxWidth: width, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        {children}
      </div>
    </div>
  );
}
