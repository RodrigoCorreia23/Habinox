import styles from "./home.module.css";

// Página inicial: apresentação e loja na mesma página, com cabeçalho próprio (ver page.tsx).
export default function HomeLayout({ children }: LayoutProps<"/[locale]">) {
  return <div className={styles.page}>{children}</div>;
}
