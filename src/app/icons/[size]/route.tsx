import { ImageResponse } from "next/og";

// App icon for the home screen (PWA), drawn in the villa colours.
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: raw } = await params;
  const size = raw === "512" ? 512 : 192;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#13281b",
          color: "#ffa91a",
          fontSize: size * 0.55,
          fontFamily: "serif",
          fontWeight: 700,
        }}
      >
        K
      </div>
    ),
    { width: size, height: size },
  );
}

export function generateStaticParams() {
  return [{ size: "192" }, { size: "512" }];
}
