import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enCACommon from "./locales/en-CA/common.json";
import enCADashboard from "./locales/en-CA/dashboard.json";
import enCAProject from "./locales/en-CA/project.json";
import enCAEditor from "./locales/en-CA/editor.json";
import enCALanding from "./locales/en-CA/landing.json";
import frCACommon from "./locales/fr-CA/common.json";
import frCADashboard from "./locales/fr-CA/dashboard.json";
import frCAProject from "./locales/fr-CA/project.json";
import frCAEditor from "./locales/fr-CA/editor.json";
import frCALanding from "./locales/fr-CA/landing.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      "en-CA": {
        common: enCACommon,
        dashboard: enCADashboard,
        project: enCAProject,
        editor: enCAEditor,
        landing: enCALanding,
      },
      "fr-CA": {
        common: frCACommon,
        dashboard: frCADashboard,
        project: frCAProject,
        editor: frCAEditor,
        landing: frCALanding,
      },
    },
    fallbackLng: "en-CA",
    defaultNS: "common",
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "i18nextLng",
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
    },
  });

// Update html lang attribute on language change
i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng;
});
// Set initial lang
document.documentElement.lang = i18n.language;

export default i18n;
