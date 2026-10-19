"use client";
import Image from "next/image";
import { useState } from "react";
export default function ProfileAvatar({
  src,
  name,
  size = 88,
}: {
  src: string | null;
  name: string;
  size?: number;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return (
    <span
      className="profile-avatar"
      style={{ width: size, height: size, fontSize: size * 0.32 }}
    >
      {src && failedSrc !== src ? (
        <Image
          src={src}
          width={size}
          height={size}
          alt=""
          unoptimized
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <span aria-hidden="true">
          {name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0])
            .join("")
            .toUpperCase() || "C"}
        </span>
      )}
    </span>
  );
}
