load('config.js');

function execute(url) {
    url = normalizeUrl(url);
    var slug = decodeURIComponent(url.split('/').pop());

    // 1. Thử lấy từ cacheStorage đã được lưu dưới dạng JSON mảng ở detail.js (Chạy offline cực nhanh)
    var cached = cacheStorage.getItem("cached_toc_" + slug);
    if (cached) {
        try {
            var chapters = JSON.parse(cached);
            if (chapters && chapters.length > 0) {
                return Response.success(chapters);
            }
        } catch (e) {
            // Lỗi parse cache thì fallback cào WebView DOM bên dưới
        }
    }

    // 2. Fallback: Khởi chạy WebView để cào DOM online nếu không có cache
    var b = Engine.newBrowser();
    var doc = null;
    try {
        b.setUserAgent(UserAgent.chrome());
        b.launchAsync(url);

        // Chờ SvelteKit render danh sách các tập phim
        for (var j = 0; j < 10; j++) {
            sleep(750);
            doc = b.html();
            if (doc && doc.select(".divide-y a[href*='/watch/']").size() > 0) break;
        }
    } finally {
        b.close();
    }

    if (doc) {
        return parseTOC(url, doc);
    }
    return Response.error("Không thể tải danh sách tập phim: " + url);
}

function parseTOC(url, doc) {
    var chapters = [];
    doc.select(".divide-y a[href*='/watch/']").forEach(function(el) {
        var epTitle = el.select("span").text() || el.text() || "";
        var epHref = el.attr("href") + "";
        if (epHref) {
            chapters.push({
                name: epTitle.trim(),
                url: normalizeUrl(epHref),
                host: BASE_URL
            });
        }
    });

    if (chapters.length === 0) {
        chapters.push({
            name: "Xem phim",
            url: url,
            host: BASE_URL
        });
    }

    return Response.success(chapters);
}
