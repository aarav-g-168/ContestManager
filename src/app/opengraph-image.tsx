import { ImageResponse } from "next/og";
export const alt = "Contest Manager — Make time for a good problem.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: 72,
          background: "#f5f2ec",
          color: "#27231f",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontSize: 30,
          }}
        >
          <span
            style={{
              display: "flex",
              background: "#df542b",
              borderRadius: 16,
              padding: 18,
              color: "white",
            }}
          >
            {"</>"}
          </span>
          contestmanager.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <span
            style={{
              fontSize: 78,
              fontWeight: 700,
              letterSpacing: -4,
              lineHeight: 1.05,
            }}
          >
            Make time for a<br />
            good problem.
          </span>
          <span style={{ fontSize: 27, color: "#625b54" }}>
            Discover contests. Set reminders. Keep learning.
          </span>
        </div>
        <div style={{ display: "flex", fontSize: 22, color: "#b13c1d" }}>
          Codeforces · LeetCode · AtCoder · and more
        </div>
      </div>
    ),
    size,
  );
}
