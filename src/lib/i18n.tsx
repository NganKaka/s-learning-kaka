import { createContext, useContext, useState, type ReactNode } from 'react';

type Locale = 'vi' | 'en';

const translations: Record<Locale, Record<string, string>> = {
  vi: {
    'nav.courses': 'Khoá học',
    'nav.flashcards': 'Thẻ ghi nhớ',
    'nav.dashboard': 'Bảng điều khiển',
    'nav.login': 'Đăng nhập',
    'nav.logout': 'Đăng xuất',
    'nav.teacher': 'Giảng viên',
    'nav.admin': 'Quản trị',
    'nav.parent': 'Phụ huynh',
    'quiz.start': 'Bắt đầu làm bài',
    'quiz.submit': 'Nộp bài',
    'quiz.practice': 'Luyện tập',
    'quiz.drill': 'Drill',
    'quiz.review': 'Xem lại',
    'common.save': 'Lưu',
    'common.cancel': 'Huỷ',
    'common.delete': 'Xoá',
    'common.loading': 'Đang tải…',
  },
  en: {
    'nav.courses': 'Courses',
    'nav.flashcards': 'Flashcards',
    'nav.dashboard': 'Dashboard',
    'nav.login': 'Sign in',
    'nav.logout': 'Sign out',
    'nav.teacher': 'Teacher',
    'nav.admin': 'Admin',
    'nav.parent': 'Parent',
    'quiz.start': 'Start quiz',
    'quiz.submit': 'Submit',
    'quiz.practice': 'Practice',
    'quiz.drill': 'Drill',
    'quiz.review': 'Review',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.loading': 'Loading…',
  },
};

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'vi',
  setLocale: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => (localStorage.getItem('locale') as Locale) || 'vi');

  const changeLocale = (l: Locale) => {
    setLocale(l);
    localStorage.setItem('locale', l);
  };

  const t = (key: string): string => translations[locale][key] ?? key;

  return (
    <I18nContext.Provider value={{ locale, setLocale: changeLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
