
"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Emp = { id: string; firstName: string; lastName: string };

export default function ReportsPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [date, setDate] = useState<string>("");

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/users");
        const data = await res.json();
        if (data?.ok && Array.isArray(data.users)) setEmployees(data.users);
      } catch {
        // ignore
      }
    })();
  }, []);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (userId) p.set("userId", userId);
    if (date) p.set("date", date);
    else {
      if (from) p.set("from", from);
      if (to) p.set("to", to);
    }
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [userId, from, to, date]);

  return (
    <div style={{ padding: 40 }}>
      <h1>Reports</h1>
      <p>Download attendance reports (Daily / Range / Per Employee):</p>

      <div style={{ display: "grid", gap: 10, maxWidth: 520, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <label>
            Employee (optional)
            <select value={userId} onChange={(e) => setUserId(e.target.value)} style={{ marginLeft: 8 }}>
              <option value="">All Employees</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.lastName}, {e.firstName} ({e.id})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label>
            Daily report (optional)
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ marginLeft: 8 }} />
          </label>
          <div style={{ fontSize: 12, color: "#666" }}>
            If you set Daily report, it will ignore the Range.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <label>
            From
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ marginLeft: 8 }} />
          </label>
          <label>
            To
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ marginLeft: 8 }} />
          </label>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
          <a
            href={`/api/reports/attendance.xlsx${query}`}
            style={{ padding: "8px 12px", border: "1px solid #333", borderRadius: 6, textDecoration: "none" }}
          >
            Download Excel (.xlsx)
          </a>
          <a
            href={`/api/reports/attendance.pdf${query}`}
            style={{ padding: "8px 12px", border: "1px solid #333", borderRadius: 6, textDecoration: "none" }}
          >
            Download PDF (.pdf)
          </a>
        </div>

        <div style={{ fontSize: 12, color: "#666" }}>
          Default range (if empty): last 30 days.
        </div>
      </div>

      <p style={{ marginTop: 20 }}>
        <a href="/admin">Back to Admin</a>
      </p>

      <button onClick={logout}>Logout</button>
    </div>
  );
}
