import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { COMPANY, WITHDRAWAL_DAYS } from "@/lib/company";
import { BETA_ANALYSES_TOTAL, PACK3_CREDITS, PACK3_PRICE_DKK, SINGLE_PRICE_DKK, isBeta } from "@/lib/plans";

export const metadata: Metadata = { title: "Handelsbetingelser" };
export const dynamic = "force-dynamic";

export default function TermsPage() {
  return (
    <LegalPage title="Handelsbetingelser">
      <h2>Hvem er vi?</h2>
      <p>
        Klardal drives af {COMPANY.name}, CVR {COMPANY.cvr}, {COMPANY.address}. E-mail: {COMPANY.email}.
        {COMPANY.phone && ` Telefon: ${COMPANY.phone}.`} E-mailadressen er også vores kontaktpunkt for myndigheder og brugere efter EU&apos;s forordning
        om digitale tjenester.
      </p>

      <h2>Hvad er Klardal?</h2>
      <p>
        Klardal er en digital tjeneste, der forklarer håndværkertilbud, peger på uklare punkter og mulige ekstraudgifter
        og hjælper dig med at stille spørgsmål. <strong>Analysen laves automatisk med kunstig intelligens (AI)</strong>,
        og Tilbudsscoren beregnes derefter efter faste regler ud fra AI&apos;ens gennemgang. Beskeder til håndværkeren er
        udkast skrevet med AI, som du selv læser igennem og sender.
      </p>
      <p>
        <strong>Analysen er vejledende.</strong> Den bygger kun på det, der står i det dokument, du uploader, og er ikke
        juridisk, teknisk eller økonomisk rådgivning. Vurderingen bygger på danske regler og er beregnet til arbejde i
        Danmark – gælder et tilbud arbejde i et andet land, passer vurderingen af regler, moms og vilkår ikke. Den kan indeholde fejl – fx hvis et dokument er utydeligt. Vi slår
        ikke firmaer op i registre (fx autorisation). Tilbudsscoren siger noget om, hvor tydeligt et tilbud er, ikke om
        håndværkerens faglige kvalitet eller hæderlighed. Prisniveauet er et groft skøn. Kontrollér altid vigtige punkter
        med håndværkeren, og søg rådgivning ved store eller komplicerede opgaver.
      </p>
      <p>
        Funktionen <strong>Find håndværkere</strong> viser aktive firmaer fra det offentlige CVR-register (Erhvervsstyrelsen)
        sorteret efter afstand. Firmaer med reklamebeskyttelse vises ikke. Vi anbefaler ikke bestemte firmaer, rangerer
        dem ikke efter kvalitet og har ingen aftaler med dem. Det er dig, der sender din tilbudsforespørgsel.
      </p>

      <h2>Hvem kan bruge Klardal?</h2>
      <p>Du skal være mindst 18 år for at oprette en konto og købe. Tjenesten er til privatpersoner (forbrugere).</p>

      {isBeta() && (
        <>
          <h2>Gratis betaperiode</h2>
          <p>
            Klardal er lige nu i en gratis betaperiode. Du får hele analysen af op til {BETA_ANALYSES_TOTAL} tilbud uden
            betaling, og der kan ikke købes noget. Vi giver dig besked på e-mail i god tid, før betaperioden slutter.
            Der starter aldrig en betaling automatisk – du skal selv vælge at købe. Priserne nedenfor gælder først
            efter betaperioden.
          </p>
        </>
      )}

      <h2>Priser og betaling</h2>
      <ul>
        <li>
          <strong>Gratis:</strong> 1 analyse med Tilbudsscore og et udvalg af resultaterne. Resten af analysen er låst.
        </li>
        <li>
          <strong>Engangskøb:</strong> {SINGLE_PRICE_DKK} kr. for én komplet analyse eller oplåsning af et
          tilbud, du allerede har fået analyseret.
        </li>
        <li>
          <strong>3-pakke:</strong> {PACK3_PRICE_DKK} kr. for {PACK3_CREDITS} komplette analyser. Hver analyse
          bruges på samme måde som et engangskøb, og pakken er beregnet til at sammenligne op til 3 tilbud på samme opgave.
          Ubrugte analyser udløber ikke.
        </li>
        <li>
          <strong>Kode fra en partner:</strong> Har du fået en kode fra en virksomhed, der samarbejder med Klardal (fx en
          ejendomsmægler), kan du indløse den på din kontoside og få gratis analyser. Hver kode kan bruges én gang pr.
          konto og et begrænset antal gange i alt. Analyser fra en kode bruges før dem, du selv har købt. Virksomheden
          betaler for analyserne, men får ingen oplysninger om dig eller dine tilbud.
        </li>
        <li>
          <strong>Sammenligning:</strong> Du kan sammenligne de tilbud, du har låst op med et engangskøb, en 3-pakke
          eller en kode.
        </li>
      </ul>
      <p>
        Alle priser er i danske kroner og er de endelige priser. Klardal er ikke momsregistreret, så der lægges ikke moms oven i. Betaling sker med kort via Stripe. Der er intet abonnement, og intet fornyes
        automatisk. Når du har købt, får du en ordrebekræftelse på e-mail med dit samtykke, oplysninger om
        fortrydelsesret og et link til disse betingelser.
      </p>

      <h2>Sletning af konto</h2>
      <p>
        Du kan slette din konto når som helst på din kontoside. Vil du have penge tilbage for et køb inden for
        fortrydelsesfristen, så brug »Fortryd aftalen her« først.
      </p>

      <h2>Fortrydelsesret</h2>
      <p>
        Du har {WITHDRAWAL_DAYS} dages fortrydelsesret, når du køber et engangskøb eller en 3-pakke. Fristen løber fra den dag, du
        køber.
      </p>
      <ul>
        <li>
          <strong>Engangskøb:</strong> Når du køber, anmoder du om adgang med det samme og anerkender, at du mister
          fortrydelsesretten, når analysen er leveret (forbrugeraftalelovens § 18, stk. 2, nr. 13). Bruger du købet – låser
          et tilbud op eller analyserer et nyt – bortfalder fortrydelsesretten for det køb. Har du ikke brugt det, kan du
          fortryde og få hele beløbet tilbage.
        </li>
        <li>
          <strong>3-pakke:</strong> Som ved engangskøb, men for hver analyse for sig: en analyse, du har brugt, er leveret,
          og for den bortfalder fortrydelsesretten. Fortryder du inden for {WITHDRAWAL_DAYS} dage, får du{" "}
          {(PACK3_PRICE_DKK / PACK3_CREDITS).toFixed(2).replace(".", ",")} kr. tilbage pr. ubrugt analyse ({PACK3_PRICE_DKK} kr. ÷{" "}
          {PACK3_CREDITS}, afrundet til hele øre), og de ubrugte analyser fjernes fra din konto.
        </li>
      </ul>
      <p>
        <strong>Sådan fortryder du:</strong> Brug knappen »Fortryd aftalen her« ved betalingen på din kontoside, eller send en
        tydelig meddelelse til {COMPANY.email}. Du kan bruge formularen nedenfor, men skal ikke. Det er nok, at du sender
        meddelelsen, inden fristen udløber. Du får en bekræftelse på e-mail.
      </p>
      <p>
        <strong>Tilbagebetaling:</strong> senest 14 dage efter, at vi har modtaget din meddelelse, med samme
        betalingsmiddel, som du brugte, og uden gebyr.
      </p>
      <p>
        <strong>Standardfortrydelsesformular</strong> (udfyld og returnér kun formularen, hvis du ønsker at fortryde
        aftalen):
        <br />
        Til {COMPANY.name}, {COMPANY.address}, {COMPANY.email}:
        <br />
        Jeg meddeler herved, at jeg ønsker at gøre brug af min fortrydelsesret i forbindelse med min aftale om levering af
        følgende tjenesteydelse/digitale indhold: ______ · Bestilt den: ______ · Forbrugerens navn: ______ · Forbrugerens
        adresse: ______ · Dato: ______
      </p>

      <h2>Din brug af tjenesten</h2>
      <ul>
        <li>Du må kun uploade dokumenter, du har ret til at bruge – typisk tilbud, du selv har modtaget.</li>
        <li>
          Overstreg gerne CPR-nummer og andre følsomme oplysninger, før du uploader. Du må ikke uploade ulovligt indhold.
        </li>
        <li>Du må ikke forsøge at omgå sikkerheden, overbelaste tjenesten eller bruge den til ulovlige formål.</li>
        <li>Du er ansvarlig for at holde din adgangskode hemmelig.</li>
      </ul>
      <p>
        Vi kan lukke en konto, der bruges i strid med betingelserne. Du får besked med en begrundelse, og har du købt
        analyser, du ikke har brugt, får du pengene tilbage for dem.
      </p>

      <h2>Mangler og ansvar</h2>
      <p>
        Analyserne er automatiske vurderinger af det uploadede dokument og kan indeholde fejl. Vi hæfter efter dansk rets
        almindelige regler, herunder købelovens regler om mangler ved digitalt indhold og digitale tjenester: Er en
        analyse mangelfuld, kan du kræve den rettet eller lavet om, et forholdsmæssigt afslag eller pengene tilbage.
        Reklamér inden for rimelig tid, efter du har opdaget fejlen. Vi hæfter ikke for indirekte tab, fx tab ved en
        aftale, du indgår med en håndværker, eller for håndværkerens arbejde, medmindre vi har handlet forsætligt eller
        groft uagtsomt. Intet i disse betingelser begrænser dine rettigheder efter ufravigelig forbrugerlovgivning.
      </p>

      <h2>Klager</h2>
      <p>
        Kontakt os på {COMPANY.email}, så finder vi en løsning. Kan vi ikke blive enige, kan du klage til Nævnenes Hus,
        Toldboden 2, 8800 Viborg, www.naevneneshus.dk.
      </p>

      <h2>Ændringer og lovvalg</h2>
      <p>
        Vi giver dig besked på e-mail mindst 30 dage før væsentlige ændringer af betingelserne eller priserne. Vil du ikke
        acceptere ændringen, kan du slette din konto, før den træder i kraft, og få pengene tilbage for analyser, du har
        købt og ikke brugt. Dansk ret gælder, men du beholder den beskyttelse,
        du har efter ufravigelige regler i det land, du bor i.
      </p>
    </LegalPage>
  );
}
