load('config.js');

function execute(url) {
    url = normalizeUrl(url);
    var chromeUa = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";

    // 1. Nếu đã có link stream m3u8/mp4 trực tiếp
    if (url.indexOf(".mp4") !== -1 || url.indexOf(".m3u8") !== -1) {
        return Response.success({
            data: url,
            type: "native",
            headers: {
                "User-Agent": chromeUa,
                "Referer": BASE_URL + "/"
            },
            host: BASE_URL,
            timeSkip: []
        });
    }

    // 2. Xử lý player CDN của haiten / sonar-cdn
    if (url.indexOf("x.haiten.org") > -1 || url.indexOf("sonar-cdn.com") > -1) {
        var vid = "";
        var directM3u8 = "";
        var originMatch = url.match(/^(https?:\/\/[^\/]+)/);
        var playerOrigin = originMatch ? (originMatch[1] + "") : "https://x.haiten.org";
        var playerHeaders = {
            "User-Agent": chromeUa,
            "Referer": playerOrigin + "/",
            "Origin": playerOrigin,
            "Accept": "*/*"
        };

        try {
            var pageRes = fetch(url, {
                method: "GET",
                headers: playerHeaders,
                timeout: 10000
            });
            if (pageRes && pageRes.ok) {
                var pageText = pageRes.text() + "";
                var directMatch = pageText.match(/https?:\\?\/\\?\/[^"'\\]+\.m3u8[^"'\\]*/);
                if (directMatch) {
                    directM3u8 = (directMatch[0] + "").replace(/\\\//g, "/").replace(/\\/g, "");
                }
                var pageVid = pageText.match(/[?&](?:v|id)=([A-Za-z0-9_-]+)/);
                if (!vid && pageVid) vid = pageVid[1] + "";
            }
        } catch (e) {}

        if (directM3u8) {
            return Response.success({
                data: directM3u8,
                type: "native",
                headers: playerHeaders,
                host: playerOrigin,
                timeSkip: []
            });
        }

        var m = url.match(/[?&](?:v|id)=([A-Za-z0-9_-]+)/);
        if (!m) m = url.match(/\/(?:embed|play|video|watch)\/([A-Za-z0-9_-]+)/);
        if (m) vid = m[1] + "";

        if (vid) {
            // Thử dò tìm subdomain phát stream active
            var subdomains = ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10"];
            var fallbackUrl = "https://c1.animez.top/" + vid + "/master.m3u8";
            for (var i = 0; i < subdomains.length; i++) {
                var testUrl = "https://" + subdomains[i] + ".animez.top/" + vid + "/master.m3u8";
                try {
                    var headers = {
                        "User-Agent": chromeUa,
                        "Referer": playerOrigin + "/",
                        "Origin": playerOrigin,
                        "Accept": "*/*",
                        "Range": "bytes=0-1"
                    };
                    var res = fetch(testUrl, {
                        method: "GET",
                        headers: headers,
                        timeout: 4000
                    });
                    if (res && (res.status === 200 || res.status === 206)) {
                        return Response.success({
                            data: testUrl,
                            type: "native",
                            headers: playerHeaders,
                            host: playerOrigin,
                            timeSkip: []
                        });
                    }
                } catch (e) {}
            }

            return Response.success({
                data: fallbackUrl,
                type: "native",
                headers: playerHeaders,
                host: playerOrigin,
                timeSkip: []
            });
        }
    }

    // 3. Fallback cho WebView tự động phát và bắt luồng
    return Response.success({
        data: url,
        type: "auto",
        headers: {
            "User-Agent": chromeUa,
            "Referer": BASE_URL + "/"
        },
        host: BASE_URL,
        timeSkip: []
    });
}
