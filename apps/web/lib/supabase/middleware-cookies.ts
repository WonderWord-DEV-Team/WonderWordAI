type CookieSource = {
  cookies: {
    getAll(): Array<{ name: string; value: string }>;
  };
};

type CookieTarget = {
  cookies: {
    set(cookie: { name: string; value: string }): void;
  };
};

export function copyCookies(from: CookieSource, to: CookieTarget) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
}
