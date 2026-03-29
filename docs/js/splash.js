document.addEventListener("DOMContentLoaded", () => {
    const splashScreen = document.getElementById('splash-screen');
    if (!splashScreen) return;

    const flaskContainer = splashScreen.querySelector('.splash-flask-container');
    const flash = splashScreen.querySelector('.splash-flash');
    const menuScreen = document.getElementById('menu-screen');
    const appHeader = document.querySelector('.app-header');

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

    flaskContainer.addEventListener('click', () => {
        if (isExploding) return;
        isExploding = true;
        flaskContainer.classList.add('exploding');
        setTimeout(() => {
            flash.classList.add('detonate');
            setTimeout(() => {
                splashScreen.style.opacity = '0';
                
                if (menuScreen) {
                    menuScreen.style.opacity = '1';
                    menuScreen.style.pointerEvents = 'auto';
                }
                if (appHeader) {
                    appHeader.style.opacity = '1';
                    appHeader.style.pointerEvents = 'auto';
                }
                setTimeout(() => {
                    splashScreen.remove();
                }, 800);
                
            }, 300);
        }, 800);
    });
});

