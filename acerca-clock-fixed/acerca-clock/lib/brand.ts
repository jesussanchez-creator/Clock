/**
 * Paleta corporativa de Grupo Acerca.
 *
 * Extraída del logo oficial. Punto único de verdad: si en el futuro hay
 * un re-branding, sólo se cambia este fichero (y el logo en /public).
 */

export const BRAND = {
  // Azul marino del texto "Acerca" — color principal de superficies oscuras
  navy: {
    50:  "#E9EBEF",
    100: "#C7CCD6",
    200: "#9AA1B0",
    300: "#6E7787",
    400: "#454D5F",
    500: "#283040", // base
    600: "#1F2535",
    700: "#171C28",
    800: "#10131C",
    900: "#080A10",
  },

  // Naranja vivo del puzzle — acento, llamadas a la acción primarias
  orange: {
    50:  "#FFF1E0",
    100: "#FFDBB0",
    200: "#FFC080",
    300: "#FFA34D",
    400: "#FF8E20",
    500: "#F88000", // base
    600: "#D86E00",
    700: "#B25A00",
    800: "#834300",
    900: "#552B00",
  },

  // Azul brillante del puzzle — secundario / decorativo
  sky: {
    50:  "#E0F4FF",
    100: "#B3E2FF",
    200: "#80CFFF",
    300: "#4DBCFF",
    400: "#1FAAFF",
    500: "#0098F8", // base
    600: "#0080D0",
    700: "#0066A8",
    800: "#004D80",
    900: "#003355",
  },
} as const;

export type BrandColor = keyof typeof BRAND;
