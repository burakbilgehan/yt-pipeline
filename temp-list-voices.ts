import { getVoices } from "edge-tts";

async function main() {
  const voices = await getVoices();
  const en = voices.filter(
    (v: any) => v.Locale.startsWith("en-") && v.Gender === "Male"
  );
  en.forEach((v: any) =>
    console.log(v.ShortName, "-", v.FriendlyName, "-", v.Locale)
  );
}

main();
