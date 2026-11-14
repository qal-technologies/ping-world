interface RouteOptions {
  fallback?: string;
  replace?: boolean;
  saveCurrent?: boolean;
}

const Navigo = {
  async igno(route: string) {
    window.location.replace(route);
  },

  async login(route?: string, options?: RouteOptions) {
    const checkLast = JSON.parse(localStorage.getItem('login-remember') ?? '');
      const goTo = route?.trim() || '/login';

    if (!checkLast && options?.saveCurrent) {
      const current = options?.fallback || window.location.href || '/';

      const remember = localStorage.setItem(
        'login-remember',
        JSON.stringify(current),
      ) as unknown;
      if (Boolean(remember)) window.location.href = goTo;
    } else if (checkLast) {
      window.location.replace(checkLast);
    } else {
      window.location.href = goTo;
    }
  },

  async register(route?: string, options?: RouteOptions) {
    const checkLast = JSON.parse(
      localStorage.getItem('register-remember') || '',
    );

    if (!checkLast) {
      const current = options?.fallback || window.location.href || '/';
      const goTo = route?.trim() || '/register';

      const remember = localStorage.setItem(
        'register-remember',
        JSON.stringify(current),
      ) as unknown;
      if (Boolean(remember)) window.location.href = goTo;
    } else if (checkLast) {
      window.location.replace(checkLast);
    }
  },
};

export default Navigo;
