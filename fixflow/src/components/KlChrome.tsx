import { COMPANY } from "@/lib/company";

/** Header and footer of the booking-service pages (front page style). */
export function KlHeader() {
  return (
    <header className="wrap">
      <nav>
        <a className="mark" href="/" style={{ color: "inherit", textDecoration: "none" }}>Klardal</a>
        <a className="navlink" href="/#ring">Gratis prøve</a>
      </nav>
    </header>
  );
}

export function KlFooter() {
  return (
    <footer>
      <div className="wrap">
        <span>Klardal · CVR {COMPANY.cvr}</span>
        <span><a href="/om">Om Klardal</a> · <a href="/vilkaar">Vilkår</a> · <a href="/privatlivspolitik">Privatlivspolitik</a></span>
      </div>
    </footer>
  );
}
