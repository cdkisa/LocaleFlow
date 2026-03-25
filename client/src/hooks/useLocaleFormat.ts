import { useTranslation } from "react-i18next";

export function useLocaleFormat() {
  const { i18n } = useTranslation();
  const locale = i18n.language;

  return {
    formatDate: (date: Date | string) =>
      new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
        new Date(date)
      ),
    formatNumber: (n: number) => new Intl.NumberFormat(locale).format(n),
    formatFileSize: (bytes: number) => {
      if (bytes < 1024 * 1024) {
        const kb = bytes / 1024;
        return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(kb)} KB`;
      }
      const mb = bytes / 1024 / 1024;
      return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(mb)} MB`;
    },
  };
}
