(() => {
    function readAppLink(url = window.location.href) {
        const match = /^#app\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(new URL(url).hash);
        return match ? match[1] : null;
    }

    function followAppLink() {
        const id = readAppLink();
        if (!id || !document.getElementById(id)?.classList.contains('app-content')) return;
        openApp(id, true);
    }

    window.addEventListener('load', followAppLink);
    window.addEventListener('hashchange', followAppLink);
})();
