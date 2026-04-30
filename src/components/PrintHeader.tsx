type Props = { title: string; subtitle?: string };

export function PrintHeader({ title, subtitle }: Props) {
  return (
    <div className="print-only mb-4">
      <h1 style={{ fontSize: "18pt", fontWeight: 600, margin: 0 }}>{title}</h1>
      {subtitle && <div style={{ fontSize: "10pt" }}>{subtitle}</div>}
      <div style={{ fontSize: "9pt", color: "#444" }}>
        Printed {new Date().toLocaleString()}
      </div>
    </div>
  );
}
