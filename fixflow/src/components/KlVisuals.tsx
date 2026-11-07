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

/** Step 1: the free check, one row per assistant. */
export function CheckVisual() {
  const rows: [string, boolean][] = [["ChatGPT", false], ["Gemini", false], ["Perplexity", true]];
  return (
    <div className="v-frame v-mini" aria-label="Eksempel på et AI-tjek">
      <p className="v-label">Nævner de jer?</p>
      {rows.map(([ai, yes]) => (
        <div className="v-row" key={ai}><span>{ai}</span><b className={yes ? "v-yes" : "v-no"}>{yes ? "Ja" : "Nej"}</b></div>
      ))}
    </div>
  );
}

/** Step 2: a Google review card. */
export function ReviewVisual() {
  return (
    <div className="v-frame v-mini" aria-label="Eksempel på en Google-anmeldelse">
      <div className="v-review">
        <span className="v-avatar" aria-hidden="true">M</span>
        <div><b>Mette</b><Stars /></div>
      </div>
      <p className="v-quote">Kom til tiden og efterlod alt pænt. Kan varmt anbefales.</p>
      <p className="v-label v-plus">+5 nye anmeldelser denne måned</p>
    </div>
  );
}

/** Step 3: the monthly report, as a tiny bar chart of AI mentions. */
export function ReportVisual() {
  const months: [string, number][] = [["Aug", 0], ["Sep", 1], ["Okt", 3], ["Nov", 5]];
  return (
    <div className="v-frame v-mini" aria-label="Eksempel på en månedsrapport">
      <p className="v-label">Antal AI-svar, der nævner jer</p>
      <div className="v-bars">
        {months.map(([m, v]) => (
          <div key={m}><i style={{ height: `${12 + v * 14}px` }} /><span>{m}</span></div>
        ))}
      </div>
    </div>
  );
}
