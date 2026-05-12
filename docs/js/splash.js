document.addEventListener("DOMContentLoaded", () => {
    const splashScreen = document.getElementById('splash-screen');
    if (!splashScreen) return;

    const SPLASH_SEEN_KEY = "atomicSmashSplashSeen";
    const flaskContainer = splashScreen.querySelector('.splash-flask-container');
    const flash = splashScreen.querySelector('.splash-flash');
    const menuScreen = document.getElementById('menu-screen');
    const appHeader = document.querySelector('.app-header');

    const hasSeenSplash = window.sessionStorage.getItem(SPLASH_SEEN_KEY) === "true";
    const referrerUrl = document.referrer ? new URL(document.referrer) : null;
    const isInternalNavigation = referrerUrl?.origin === window.location.origin;

    if (hasSeenSplash || isInternalNavigation) {
        window.sessionStorage.setItem(SPLASH_SEEN_KEY, "true");
        revealMenu();
        splashScreen.remove();
        return;
    }

    if (menuScreen) {
        menuScreen.style.opacity = '0';
        menuScreen.style.pointerEvents = 'none';
        menuScreen.style.transition = 'opacity 0.8s ease';
    }
    if (appHeader) {
        appHeader.style.opacity = '0';
        appHeader.style.pointerEvents = 'none';
        appHeader.style.transition = 'opacity 0.8s ease';
    }

    let isExploding = false;

    const triggerExplosion = () => {
        if (isExploding) return;
        isExploding = true;
        window.sessionStorage.setItem(SPLASH_SEEN_KEY, "true");
        flaskContainer.classList.add('exploding');
        setTimeout(() => {
            flash.classList.add('detonate');
            setTimeout(() => {
                splashScreen.style.opacity = '0';
                
                revealMenu();
                setTimeout(() => {
                    splashScreen.remove();
                }, 800);
                
            }, 300);
        }, 800);
    };

    flaskContainer.addEventListener('click', triggerExplosion);

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            triggerExplosion();
        }
    });

    function revealMenu() {
        if (menuScreen) {
            menuScreen.style.opacity = '1';
            menuScreen.style.pointerEvents = 'auto';
        }
        if (appHeader) {
            appHeader.style.opacity = '1';
            appHeader.style.pointerEvents = 'auto';
        }
    }
});
