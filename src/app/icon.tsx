import { ImageResponse } from "next/og";

export function generateImageMetadata() {
  return [
    { contentType: "image/png", size: { width: 32, height: 32 }, id: "32" },
    { contentType: "image/png", size: { width: 192, height: 192 }, id: "192" },
    { contentType: "image/png", size: { width: 512, height: 512 }, id: "512" },
  ];
}

export default function Icon({ id }: { id: string }) {
  const size = id === "512" ? 512 : id === "192" ? 192 : 32;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#071c16",
          color: "#c9a227",
          fontSize: Math.round(size * 0.52),
          fontWeight: 700,
        }}
      >
        C
      </div>
    ),
    { width: size, height: size },
  );
}
