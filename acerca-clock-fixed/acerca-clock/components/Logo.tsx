import Image from "next/image";

interface LogoProps {
  /** Alto en píxeles (ancho proporcional, ratio ~3.3:1 del logo). */
  height?: number;
  /** Si true, muestra una versión "icono" cuadrada para favicons / pequeñas. */
  icon?: boolean;
  className?: string;
}

/**
 * Logo oficial de Grupo Acerca.
 *
 * El archivo /public/logo.png contiene el lockup completo
 * (puzzle naranja + texto). Para versiones pequeñas (icon=true)
 * mostramos un cuadrado con las iniciales sobre fondo navy corporativo.
 */
export default function Logo({ height = 36, icon = false, className }: LogoProps) {
  if (icon) {
    return (
      <div
        className={
          "rounded-lg bg-navy-500 text-white flex items-center justify-center font-semibold flex-shrink-0 " +
          (className ?? "")
        }
        style={{ width: height, height, fontSize: Math.round(height * 0.38) }}
        aria-label="Grupo Acerca"
      >
        <span className="text-orange-500">G</span>
        <span>A</span>
      </div>
    );
  }

  // Logo oficial — ratio aproximado 206×62 ≈ 3.32:1
  const width = Math.round(height * (206 / 62));

  return (
    <Image
      src="/logo.png"
      alt="Grupo Acerca"
      width={width}
      height={height}
      priority
      className={className}
    />
  );
}
