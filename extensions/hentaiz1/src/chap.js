load('config.js');

function execute(url) {
    url = normalizeUrl(url);

    var res = fetch(url, { headers: { "User-Agent": UserAgent.chrome() } });
    var doc = res && res.ok ? res.html() : null;

    if (!doc) {
        var browser = Engine.newBrowser();
        try {
            doc = browser.launch(url, 8000);
        } finally {
            browser.close();
        }
    }

    if (doc) {
        var tracks = [];
        
        // 1. Tìm iframe phát video
        var iframeEl = doc.select("iframe").first();
        var embedUrl = iframeEl ? iframeEl.attr("src") + "" : "";

        // 2. Tìm trong JSON-LD metadata VideoObject (nếu có giống hentaizbot)
        if (!embedUrl) {
            doc.select('script[type="application/ld+json"]').forEach(function(e) {
                if (embedUrl) return;
                var txt = (e.html() || "") + "";
                if (txt.indexOf("VideoObject") === -1) return;
                try {
                    var obj = JSON.parse(txt);
                    if (obj && obj.embedUrl) embedUrl = obj.embedUrl + "";
                } catch (err) {}
            });
        }

        if (embedUrl) {
            tracks.push({
                title: "Xem Phim (HentaiZ1)",
                data: normalizeUrl(embedUrl)
            });
            return Response.success(tracks);
        }

        // 3. Nếu có các server CDN ở bên ngoài
        var servers = doc.select(".player__cdn, button[data-source]");
        if (servers.size() > 0) {
            servers.forEach(function(item) {
                var serverUrl = item.attr("data-source") || item.attr("data-src") || item.attr("src");
                if (serverUrl) {
                    tracks.push({
                        title: "Server VIP",
                        data: normalizeUrl(serverUrl)
                    });
                }
            });
        }

        if (tracks.length > 0) {
            return Response.success(tracks);
        }

        // Fallback cuối cùng: nạp chính URL trang xem phim để track.js tự xử lý
        tracks.push({
            title: "Tự động phát",
            data: url
        });
        return Response.success(tracks);
    }

    return Response.error("Không thể tải thông tin tập phim");
}
