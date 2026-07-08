import { useI18n, type Language } from '../../i18n/I18nContext';

const labels: Record<Language, string> = {
    uz: 'O‘z',
    ru: 'РУ',
    en: 'EN',
};

export default function LanguageSwitcher() {
    const { lang, setLang } = useI18n();

    return (
        <div className="flex items-center rounded-2xl border border-slate-600 bg-[#111827] p-1 text-xs font-black">
            {(Object.keys(labels) as Language[]).map((key) => (
                <button
                    key={key}
                    onClick={() => setLang(key)}
                    className={`rounded-xl px-3 py-2 transition-colors ${lang === key ? 'bg-cyan-500 text-[#06111f]' : 'text-slate-300 hover:text-white'}`}
                >
                    {labels[key]}
                </button>
            ))}
        </div>
    );
}
