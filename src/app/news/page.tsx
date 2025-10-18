import styles from "./page.module.scss";
import HomeGrid from "@/components/home/HomeGridComponent";

export default function Home() {
  return (
    <div className={styles.sectionHome}>
      <HomeGrid title="Dashboard" />
    </div>
  );
}
