import type { Dal } from "@/types";
import { useState } from "react";

interface DalAvatarProps {
  dal: Dal;
  size?: number; // px — defaults to 32
  className?: string;
}

/** Circular dal avatar — shows logo image or colored initial fallback */
export function DalAvatar({ dal, size = 32, className = "" }: DalAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const sizeStyle = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
  };

  if (dal.logo && !imgError) {
    return (
      <img
        src={dal.logo}
        alt={dal.name}
        onError={() => setImgError(true)}
        style={sizeStyle}
        className={`rounded-full object-cover ring-2 ring-gray-100 shrink-0 ${className}`}
      />
    );
  }

  // Fallback: colored initial circle
  const fontSize = Math.round(size * 0.38);
  return (
    <div
      style={{ ...sizeStyle, backgroundColor: dal.color, fontSize }}
      className={`rounded-full flex items-center justify-center text-white font-bold shrink-0 ring-2 ring-gray-100 ${className}`}
    >
      {dal.abbreviation}
    </div>
  );
}

/** Inline logo option for custom dropdown list items */
export function DalOption({ dal }: { dal: Dal }) {
  return (
    <span className="flex items-center gap-2">
      <DalAvatar dal={dal} size={20} />
      <span>{dal.name}</span>
    </span>
  );
}
