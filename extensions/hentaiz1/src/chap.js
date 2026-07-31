load('config.js');

function execute(url) {
    url = normalizeUrl(url);

    var res = fetch(url, { headers: { "User-Agent": UserAgent.chrome() } });
    var doc = res && res.ok ? res.html() : null;
    var html = res && res.ok ? res.text() + "" : "";

    var tracks = [];
    var embedUrl = "";

    if (doc) {
        // 1. Tìm iframe phát video trong HTML tĩnh (cho các phim cũ)
        var iframeEl = doc.select("iframe").first();
        if (iframeEl) embedUrl = iframeEl.attr("src") + "";

        // 2. Tìm trong JSON-LD metadata VideoObject
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

        // 3. Nếu có các server CDN ở bên ngoài DOM
        if (!embedUrl) {
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
        }
    }

    // 4. Nếu chưa có embedUrl, gọi SvelteKit Remote API (cho các bộ phim mới)
    if (!embedUrl && html) {
        var episodeId = "";
        var epMatch = html.match(/"id"\s*:\s*"([A-Za-z0-9_-]{10,15})"/);
        if (epMatch) episodeId = epMatch[1];
        if (!episodeId) {
            var epMatch2 = html.match(/episode\s*:\s*\{\s*id\s*:\s*["']([^"']+)["']/);
            if (epMatch2) episodeId = epMatch2[1];
        }

        var hash = "1edhnia";
        var hashMatch = html.match(/\/remote\/([a-zA-Z0-9_-]+)\//);
        if (hashMatch) hash = hashMatch[1];

        if (episodeId) {
            try {
                load("crypto.js");
                var rawPayload = JSON.stringify([{ "episodeId": 1 }, episodeId]);
                var base64Payload = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(rawPayload));
                var apiUrl = BASE_URL + "/_app/remote/" + hash + "/getEpisodeEmbedUrl?payload=" + encodeURIComponent(base64Payload);

                var apiRes = fetch(apiUrl, {
                    headers: {
                        "User-Agent": UserAgent.chrome(),
                        "Referer": url
                    }
                });

                if (apiRes && apiRes.ok) {
                    var apiText = apiRes.text() + "";
                    var urlMatch = apiText.match(/https?:\\?\/\\?\/[^"'\\]+/i);
                    if (urlMatch) {
                        embedUrl = urlMatch[0].replace(/\\\//g, "/").replace(/\\/g, "");
                    }
                }
            } catch (err) {}
        }
    }

    // 5. Fallback qua Browser engine nếu vẫn chưa lấy được
    if (!embedUrl && tracks.length === 0) {
        try {
            var browser = Engine.newBrowser();
            try {
                var bDoc = browser.launch(url, 5000);
                if (bDoc) {
                    var bIframe = bDoc.select("iframe").first();
                    if (bIframe) embedUrl = bIframe.attr("src") + "";
                }
            } finally {
                browser.close();
            }
        } catch (err) {}
    }

    if (embedUrl) {
        tracks.push({
            title: "Xem Phim (HentaiZ1)",
            data: normalizeUrl(embedUrl)
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
