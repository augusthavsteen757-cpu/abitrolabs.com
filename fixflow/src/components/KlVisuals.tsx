/**
 * Small illustrations for the front page, drawn in HTML so they stay sharp, light and readable in both themes.
 * Every firm and number in them is made up and marked "Eksempel", so nothing reads as a real review or result.
 */

const Stars = ({ n = 5 }: { n?: number }) => <span className="v-stars" aria-label={`${n} stjerner`}>{"★".repeat(n)}</span>;

/** A ChatGPT-style answer to a local question, with the firm we want in it highlighted. */
export function ChatVisual() {
  return (
    <figure className="v-frame v-chat" aria-label="Eksempel på et svar fra ChatGPT">
      <div className="v-bar"><span /><span /><span /><b>ChatGPT</b></div>
      <div className="v-body">
        <p className="v-q">Kan du anbefale en maler i Svendborg?</p>
        <div className="v-a">
          <p>Her er tre malere i Svendborg med gode anmeldelser:</p>
          <ol>
            <li><b>Sydfyns Malerservice</b> <Stars /> <small>4,8 · 41 anmeldelser</small></li>
            <li className="v-you"><b>Jeres firma</b> <Stars /> <small>4,9 · 23 anmeldelser</small></li>
            <li><b>Maler Holm</b> <Stars n={4} /> <small>4,5 · 12 anmeldelser</small></li>
          </ol>
        </div>
      </div>
      <figcaption>Eksempel</figcaption>
    </figure>
  );
}

/** A Google local search result ("map pack"), with the firm we want in it highlighted. */
export function GoogleVisual() {
  const rows: [string, string, number, number, boolean][] = [
    ["Sydfyns Malerservice", "4,8", 41, 5, false],
    ["Jeres firma", "4,9", 23, 5, true],
    ["Maler Holm", "4,5", 12, 4, false],
  ];
  return (
    <figure className="v-frame v-chat" aria-label="Eksempel på et søgeresultat på Google">
      <div className="v-search"><span className="v-g">G</span><span>maler svendborg</span></div>
      <div className="v-body">
        <ol className="v-places">
          {rows.map(([name, score, count, stars, you]) => (
            <li key={name} className={you ? "v-you" : undefined}>
              <b>{name}</b>
              <span><small>{score}</small> <Stars n={stars} /> <small>({count})</small></span>
              <small>Maler · Svendborg</small>
            </li>
          ))}
        </ol>
      </div>
      <figcaption>Eksempel</figcaption>
    </figure>
  );
}

/** Step 1: the free check, one row per assistant. */
export function CheckVisual() {
  const rows: [string, boolean][] = [["Google, top 3", false], ["ChatGPT", false], ["Gemini", true]];
  return (
    <div className="v-frame v-mini" aria-label="Eksempel på et tjek">
      <p className="v-label">Nævner de jer?</p>
      {rows.map(([ai, yes]) => (
        <div className="v-row" key={ai}><span>{ai}</span><b className={yes ? "v-yes" : "v-no"}>{yes ? "Ja" : "Nej"}</b></div>
      ))}
    </div>
  );
}

/** Step 2: what an AI assistant reads about the firm on its Klardal profile. */
export function AiReadyVisual() {
  const lines: [string, string][] = [["Firma", "Jeres firma"], ["Fag", "Maler"], ["Område", "Svendborg, Tåsinge, Faaborg"], ["Pris", "Fra 425 kr. i timen"], ["Ledig", "Uge 48"]];
  return (
    <div className="v-frame v-mini" aria-label="Eksempel på det, ChatGPT kan læse om jer">
      <p className="v-label">Det læser ChatGPT om jer</p>
      <dl className="v-facts">
        {lines.map(([k, v]) => (<div key={k}><dt>{k}</dt><dd>{v}</dd></div>))}
      </dl>
    </div>
  );
}

/** Step 3: watching the competition, the firm's place in the local ranking month by month. */
export function RivalsVisual() {
  const rows: [string, string, string][] = [["Sydfyns Malerservice", "1", "1"], ["Jeres firma", "6", "2"], ["Maler Holm", "2", "3"]];
  return (
    <div className="v-frame v-mini" aria-label="Eksempel på en rapport om konkurrenterne">
      <p className="v-label">Hvem anbefales i Svendborg?</p>
      <div className="v-row v-head"><span /><span>Okt</span><span>Nov</span></div>
      {rows.map(([n, a, b]) => (
        <div className={`v-row${n === "Jeres firma" ? " v-me" : ""}`} key={n}><span>{n}</span><span>#{a}</span><b>#{b}</b></div>
      ))}
    </div>
  );
}
