import { Archivo, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

// Ver DESIGN.md: Archivo (títulos, preços), IBM Plex Sans (corpo), IBM Plex Mono (medidas, códigos).
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

/** Classes a pôr no <html> de cada root layout. */
export const fontVariables = `${archivo.variable} ${plexSans.variable} ${plexMono.variable}`;
